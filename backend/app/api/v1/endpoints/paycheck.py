import json
import zoneinfo
from datetime import datetime, date as dt_date
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.config import settings
from app.models.paycheck import PaycheckConfig, PaycheckBucket, PaycheckSession
from app.models.transaction import Transaction

WIB = zoneinfo.ZoneInfo(settings.TIMEZONE)
from app.schemas.paycheck import (
    PaycheckConfigOut,
    PaycheckConfigUpdate,
    PaycheckBucketBase,
    PaycheckBucketOut,
    PaycheckStep,
    PaycheckSessionOut,
    PaycheckStartRequest,
)

router = APIRouter()

def get_or_seed_config(db: Session) -> PaycheckConfig:
    cfg = db.query(PaycheckConfig).filter(PaycheckConfig.id == 1).first()
    if not cfg:
        cfg = PaycheckConfig(
            id=1,
            source_account="BRI 1",
            use_gate=True,
            gate_name="Flip",
            cycle_type="biweekly",
            cycle_days=14,
            pocket_account="Mandiri",
            is_active=True
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg

def get_or_seed_buckets(db: Session, config_id: int = 1) -> List[PaycheckBucket]:
    buckets = db.query(PaycheckBucket).filter(PaycheckBucket.config_id == config_id).order_by(PaycheckBucket.sort_order.asc()).all()
    if not buckets:
        default_buckets = [
            PaycheckBucket(
                config_id=config_id,
                account="Mandiri",
                percentage=55.0,
                via_gate=True,
                via_secondary=None,
                purpose="Uang Saku Harian (Makan, Jajan, Laundry, Galon)",
                sort_order=1
            ),
            PaycheckBucket(
                config_id=config_id,
                account="Bank Jago",
                percentage=18.33,
                via_gate=True,
                via_secondary=None,
                purpose="Langganan & Tagihan Rutin",
                sort_order=2
            ),
            PaycheckBucket(
                config_id=config_id,
                account="Bibit",
                percentage=13.33,
                via_gate=True,
                via_secondary="Bank Jago",
                purpose="Investasi Reksadana & Saham",
                sort_order=3
            ),
            PaycheckBucket(
                config_id=config_id,
                account="BRI 2",
                percentage=6.67,
                via_gate=False,
                via_secondary=None,
                purpose="Tabungan Terkunci",
                sort_order=4
            ),
            PaycheckBucket(
                config_id=config_id,
                account="BRI 1",
                percentage=6.67,
                via_gate=False,
                via_secondary=None,
                purpose="Hub Gajian & Dana Darurat",
                sort_order=5
            ),
        ]
        db.add_all(default_buckets)
        db.commit()
        buckets = db.query(PaycheckBucket).filter(PaycheckBucket.config_id == config_id).order_by(PaycheckBucket.sort_order.asc()).all()
    return buckets

def compute_bucket_amounts(total_amount: int, buckets: List[PaycheckBucket], override: Optional[Dict[str, int]] = None) -> Dict[str, int]:
    result = {}
    if override:
        for b in buckets:
            result[b.account] = int(override.get(b.account, 0))
        return result

    # Standard formula for 1.500.000
    if total_amount == 1500000:
        return {
            "Mandiri": 825000,
            "Bank Jago": 275000,
            "Bibit": 200000,
            "BRI 2": 100000,
            "BRI 1": 100000,
        }

    # Dynamic percentage calculation
    allocated_sum = 0
    for idx, b in enumerate(buckets):
        if idx == len(buckets) - 1:
            amt = total_amount - allocated_sum
        else:
            amt = int(round(total_amount * (b.percentage / 100.0)))
            allocated_sum += amt
        result[b.account] = max(0, amt)
    return result

def generate_steps(config: PaycheckConfig, buckets: List[PaycheckBucket], amounts: Dict[str, int]) -> List[PaycheckStep]:
    steps: List[PaycheckStep] = []

    # Identify categories
    gate_buckets = [b for b in buckets if b.via_gate and not b.via_secondary]
    secondary_buckets = [b for b in buckets if b.via_secondary]
    direct_buckets = [b for b in buckets if not b.via_gate and b.account != config.source_account]
    hub_bucket = next((b for b in buckets if b.account == config.source_account), None)

    # ------------------ PHASE 1: SUMBER DANA (BRImo / source_account) ------------------
    # 1. Direct transfers (e.g. BRI 1 -> BRI 2)
    for b in direct_buckets:
        amt = amounts.get(b.account, 0)
        if amt > 0:
            steps.append(PaycheckStep(
                id=f"direct_{b.account.lower().replace(' ', '_')}",
                phase=1,
                app=f"BRImo / {config.source_account}",
                title=f"Transfer {config.source_account} → {b.account}",
                badge="Sesama Bank",
                description=f"{b.purpose} (Rp {amt:,})",
                source_account=config.source_account,
                target_account=b.account,
                amount=amt,
                is_done=False,
                is_auto=False,
                creates_income=True,
            ))

    # 2. Sisa di Rekening Hub (e.g. BRI 1)
    if hub_bucket:
        hub_amt = amounts.get(hub_bucket.account, 0)
        if hub_amt > 0:
            steps.append(PaycheckStep(
                id=f"stay_{hub_bucket.account.lower().replace(' ', '_')}",
                phase=1,
                app=config.source_account,
                title=f"Sisa Saldo di {config.source_account}",
                badge="Rekening Hub",
                description=f"{hub_bucket.purpose} (Otomatis tetap di rekening penampung)",
                source_account=config.source_account,
                target_account=hub_bucket.account,
                amount=hub_amt,
                is_done=True,
                is_auto=True,
                creates_income=True,
            ))

    # 3. Gate Funding Step (if use_gate is active)
    if config.use_gate and (gate_buckets or secondary_buckets):
        gate_total = sum(amounts.get(b.account, 0) for b in gate_buckets) + sum(amounts.get(b.account, 0) for b in secondary_buckets)
        if gate_total > 0:
            steps.append(PaycheckStep(
                id="gate_funding",
                phase=1,
                app=f"BRImo / {config.source_account}",
                title=f"Top Up / Transfer {config.source_account} → {config.gate_name}",
                badge="Jembatan Bebas Admin",
                description=f"Kirim total Rp {gate_total:,} ke {config.gate_name} untuk distribusi ke rekening operasional & investasi",
                source_account=config.source_account,
                target_account=config.gate_name,
                amount=gate_total,
                is_done=False,
                is_auto=False,
                creates_income=False, # Bridge funding, not final income
            ))

    # ------------------ PHASE 2: DISTRIBUSI VIA GATE (Flip) ------------------
    if config.use_gate:
        # Accounts that also carry secondary funds (e.g. Jago carries Bibit)
        for b in gate_buckets:
            base_amt = amounts.get(b.account, 0)
            sub_carrying = sum(amounts.get(sec.account, 0) for sec in secondary_buckets if sec.via_secondary == b.account)
            total_sent = base_amt + sub_carrying
            if total_sent > 0:
                is_carrying = sub_carrying > 0
                desc = f"Gabungan pos {b.purpose} (Rp {base_amt:,})" + (f" + modal {', '.join(s.account for s in secondary_buckets if s.via_secondary == b.account)} (Rp {sub_carrying:,})" if is_carrying else "")
                steps.append(PaycheckStep(
                    id=f"gate_to_{b.account.lower().replace(' ', '_')}",
                    phase=2,
                    app=config.gate_name,
                    title=f"{config.gate_name} → {b.account}",
                    badge="Bebas Admin",
                    description=desc,
                    source_account=config.gate_name,
                    target_account=b.account,
                    amount=total_sent,
                    is_done=False,
                    is_auto=False,
                    creates_income=not is_carrying, # If it doesn't carry secondary, it's the direct income. If it carries, final income is recorded on Phase 3
                ))
    else:
        # Direct mode (without gate)
        for b in gate_buckets + secondary_buckets:
            amt = amounts.get(b.account, 0)
            if amt > 0:
                steps.append(PaycheckStep(
                    id=f"direct_to_{b.account.lower().replace(' ', '_')}",
                    phase=1,
                    app=config.source_account,
                    title=f"Transfer {config.source_account} → {b.account}",
                    badge="Direct Transfer",
                    description=f"{b.purpose} (Rp {amt:,})",
                    source_account=config.source_account,
                    target_account=b.account,
                    amount=amt,
                    is_done=False,
                    is_auto=False,
                    creates_income=True,
                ))

    # ------------------ PHASE 3: ALOKASI LANJUTAN (Bank Jago -> Bibit) ------------------
    for b in secondary_buckets:
        amt = amounts.get(b.account, 0)
        if amt > 0:
            steps.append(PaycheckStep(
                id=f"secondary_{b.account.lower().replace(' ', '_')}",
                phase=3,
                app=f"{b.via_secondary} / {b.account}",
                title=f"Top Up {b.via_secondary} → {b.account}",
                badge="Investasi / Sekunder",
                description=f"{b.purpose} (Rp {amt:,})",
                source_account=b.via_secondary or config.source_account,
                target_account=b.account,
                amount=amt,
                is_done=False,
                is_auto=False,
                creates_income=True,
            ))

    # For accounts carrying secondary funds, record their residual balance as final income once reached
    if config.use_gate:
        for b in gate_buckets:
            has_sec = any(sec.via_secondary == b.account for sec in secondary_buckets)
            if has_sec:
                base_amt = amounts.get(b.account, 0)
                if base_amt > 0:
                    steps.append(PaycheckStep(
                        id=f"residual_{b.account.lower().replace(' ', '_')}",
                        phase=3,
                        app=b.account,
                        title=f"Sisa Saldo di {b.account}",
                        badge="Autodebet / Rutin",
                        description=f"{b.purpose} (Tersimpan otomatis untuk autodebet & tagihan)",
                        source_account=b.account,
                        target_account=b.account,
                        amount=base_amt,
                        is_done=False,
                        is_auto=True,
                        creates_income=True,
                    ))

    return steps

def format_session_out(session: PaycheckSession) -> PaycheckSessionOut:
    steps_data = json.loads(session.steps_json)
    steps = [PaycheckStep(**s) for s in steps_data]
    total_steps = len(steps)
    completed_steps = sum(1 for s in steps if s.is_done)
    pct = round((completed_steps / total_steps * 100), 1) if total_steps > 0 else 0.0

    return PaycheckSessionOut(
        id=session.id,
        total_amount=session.total_amount,
        date=session.date,
        status=session.status,
        note=session.note,
        steps=steps,
        completed_steps=completed_steps,
        total_steps=total_steps,
        progress_percentage=pct,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )

@router.get("/config")
def get_paycheck_config_and_buckets(db: Session = Depends(get_db)):
    cfg = get_or_seed_config(db)
    buckets = get_or_seed_buckets(db, cfg.id)
    return {
        "config": PaycheckConfigOut.from_orm(cfg),
        "buckets": [PaycheckBucketOut.from_orm(b) for b in buckets],
    }

@router.put("/config", response_model=PaycheckConfigOut)
def update_paycheck_config(payload: PaycheckConfigUpdate, db: Session = Depends(get_db)):
    cfg = get_or_seed_config(db)
    cfg.source_account = payload.source_account
    cfg.use_gate = payload.use_gate
    cfg.gate_name = payload.gate_name
    cfg.cycle_type = payload.cycle_type
    cfg.cycle_days = payload.cycle_days
    cfg.pocket_account = payload.pocket_account
    db.commit()
    db.refresh(cfg)
    return PaycheckConfigOut.from_orm(cfg)

@router.put("/buckets", response_model=List[PaycheckBucketOut])
def update_paycheck_buckets(payload: List[PaycheckBucketBase], db: Session = Depends(get_db)):
    cfg = get_or_seed_config(db)
    # Clear existing and replace
    db.query(PaycheckBucket).filter(PaycheckBucket.config_id == cfg.id).delete()
    new_buckets = []
    for idx, b in enumerate(payload):
        bucket = PaycheckBucket(
            config_id=cfg.id,
            account=b.account,
            percentage=b.percentage,
            fixed_amount=b.fixed_amount,
            via_gate=b.via_gate,
            via_secondary=b.via_secondary,
            purpose=b.purpose,
            sort_order=idx + 1
        )
        db.add(bucket)
        new_buckets.append(bucket)
    db.commit()
    return [PaycheckBucketOut.from_orm(b) for b in new_buckets]

@router.get("/session/active", response_model=Optional[PaycheckSessionOut])
def get_active_paycheck_session(db: Session = Depends(get_db)):
    session = db.query(PaycheckSession).filter(PaycheckSession.status == "in_progress").order_by(PaycheckSession.id.desc()).first()
    if not session:
        return None
    return format_session_out(session)

@router.post("/session/start", response_model=PaycheckSessionOut)
def start_paycheck_session(payload: PaycheckStartRequest, db: Session = Depends(get_db)):
    # Cancel any existing active session to avoid stale dangling sessions
    active = db.query(PaycheckSession).filter(PaycheckSession.status == "in_progress").all()
    for s in active:
        s.status = "cancelled"
    db.commit()

    cfg = get_or_seed_config(db)
    buckets = get_or_seed_buckets(db, cfg.id)
    amounts = compute_bucket_amounts(payload.total_amount, buckets, payload.allocations)
    steps = generate_steps(cfg, buckets, amounts)

    now_wib = datetime.now(WIB)
    cycle_date = payload.date or now_wib.date()

    # Pre-record income for auto steps (e.g. Sisa di BRI 1 and Sisa di Jago)
    for s in steps:
        if s.is_auto and s.is_done and s.creates_income:
            tx = Transaction(
                type="income",
                amount=s.amount,
                account=s.target_account,
                category="Gajian",
                description=f"Gajian (Alokasi {s.target_account})",
                date=cycle_date,
            )
            db.add(tx)
            db.flush()
            s.transaction_id = tx.id

    steps_dicts = [s.dict() for s in steps]

    session = PaycheckSession(
        total_amount=payload.total_amount,
        date=cycle_date,
        status="in_progress",
        note=payload.note,
        steps_json=json.dumps(steps_dicts),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return format_session_out(session)

@router.post("/session/{session_id}/step/{step_id}/toggle", response_model=PaycheckSessionOut)
def toggle_paycheck_step(session_id: int, step_id: str, db: Session = Depends(get_db)):
    session = db.query(PaycheckSession).filter(PaycheckSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi gajian tidak ditemukan")

    steps_data = json.loads(session.steps_json)
    target_step = None
    for s in steps_data:
        if s["id"] == step_id:
            target_step = s
            break

    if not target_step:
        raise HTTPException(status_code=404, detail="Langkah transfer tidak ditemukan")

    # Toggle
    now_done = not target_step["is_done"]
    target_step["is_done"] = now_done

    if now_done:
        # If creates_income and no tx yet, create income transaction
        if target_step.get("creates_income") and not target_step.get("transaction_id"):
            tx = Transaction(
                type="income",
                amount=target_step["amount"],
                account=target_step["target_account"],
                category="Gajian",
                description=f"Gajian (Alokasi {target_step['target_account']})",
                date=session.date,
            )
            db.add(tx)
            db.flush()
            target_step["transaction_id"] = tx.id
    else:
        # If untoggled, remove transaction if created
        tx_id = target_step.get("transaction_id")
        if tx_id:
            tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
            if tx:
                db.delete(tx)
            target_step["transaction_id"] = None

    # Cascade for gate steps that carry secondary funds (e.g. gate_to_bank_jago -> residual_bank_jago)
    if target_step["id"].startswith("gate_to_"):
        target_account_name = target_step["target_account"].lower().replace(" ", "_")
        residual_id = f"residual_{target_account_name}"
        for s in steps_data:
            if s["id"] == residual_id:
                s["is_done"] = now_done
                if now_done:
                    if s.get("creates_income") and not s.get("transaction_id"):
                        tx = Transaction(
                            type="income",
                            amount=s["amount"],
                            account=s["target_account"],
                            category="Gajian",
                            description=f"Gajian (Alokasi {s['target_account']})",
                            date=session.date,
                        )
                        db.add(tx)
                        db.flush()
                        s["transaction_id"] = tx.id
                else:
                    tx_id = s.get("transaction_id")
                    if tx_id:
                        tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
                        if tx:
                            db.delete(tx)
                        s["transaction_id"] = None
                break

    # Check if all steps are completed
    all_done = all(s["is_done"] for s in steps_data)
    if all_done:
        session.status = "completed"
        # Auto sync Google Sheets snapshot in background / safe block
        try:
            from app.services.sheets_sync import sync_cycle_snapshot
            sync_cycle_snapshot(db, cycle_start_date=session.date)
        except Exception as e:
            print(f"[Paycheck Sync Warning] Failed to auto sync sheets: {e}")
    else:
        session.status = "in_progress"

    session.steps_json = json.dumps(steps_data)
    db.commit()
    db.refresh(session)

    return format_session_out(session)

@router.post("/session/{session_id}/complete_all", response_model=PaycheckSessionOut)
def complete_all_paycheck_steps(session_id: int, db: Session = Depends(get_db)):
    session = db.query(PaycheckSession).filter(PaycheckSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi gajian tidak ditemukan")

    steps_data = json.loads(session.steps_json)
    for s in steps_data:
        if not s["is_done"]:
            s["is_done"] = True
            if s.get("creates_income") and not s.get("transaction_id"):
                tx = Transaction(
                    type="income",
                    amount=s["amount"],
                    account=s["target_account"],
                    category="Gajian",
                    description=f"Gajian (Alokasi {s['target_account']})",
                    date=session.date,
                )
                db.add(tx)
                db.flush()
                s["transaction_id"] = tx.id

    session.status = "completed"
    session.steps_json = json.dumps(steps_data)
    db.commit()
    db.refresh(session)

    try:
        from app.services.sheets_sync import sync_cycle_snapshot
        sync_cycle_snapshot(db, cycle_start_date=session.date)
    except Exception as e:
        print(f"[Paycheck Sync Warning] Failed to auto sync sheets: {e}")

    return format_session_out(session)

@router.post("/session/{session_id}/cancel")
def cancel_paycheck_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(PaycheckSession).filter(PaycheckSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi gajian tidak ditemukan")

    # Clean up transactions created during this session
    steps_data = json.loads(session.steps_json)
    for s in steps_data:
        tx_id = s.get("transaction_id")
        if tx_id:
            tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
            if tx:
                db.delete(tx)

    session.status = "cancelled"
    db.commit()
    return {"message": "Sesi alokasi gajian dibatalkan dan transaksi dibersihkan"}
