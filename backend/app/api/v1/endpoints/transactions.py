import io
import csv
from typing import Optional, List
from datetime import datetime, date, timedelta
import zoneinfo

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionOut,
    PaycheckRequest,
    PaycheckResponse,
    PaycheckAllocationItem,
    TransferCreate,
    TransferResponse,
)
from app.core.config import settings

router = APIRouter()
WIB = zoneinfo.ZoneInfo(settings.TIMEZONE)

@router.get("", response_model=List[TransactionOut])
def list_transactions(
    month: Optional[str] = Query(None, description="Format YYYY-MM"),
    category: Optional[str] = None,
    account: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)

    if month:
        try:
            yr, mo = map(int, month.split("-"))
            start_date = date(yr, mo, 1)
            if mo == 12:
                end_date = date(yr + 1, 1, 1)
            else:
                end_date = date(yr, mo + 1, 1)
            query = query.filter(Transaction.date >= start_date, Transaction.date < end_date)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid month format, use YYYY-MM")

    if category and category != "all":
        query = query.filter(Transaction.category == category)
    if account and account != "all":
        query = query.filter(Transaction.account == account)
    if type and type != "all":
        query = query.filter(Transaction.type == type)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Transaction.description.ilike(search_filter)) | 
            (Transaction.raw_text.ilike(search_filter))
        )

    return query.order_by(desc(Transaction.id)).offset(offset).limit(limit).all()

@router.post("", response_model=TransactionOut)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db)
):
    now_wib = datetime.now(WIB)
    tx_date = payload.date or now_wib.date()

    tx = Transaction(
        type=payload.type,
        amount=payload.amount,
        account=payload.account,
        category=payload.category,
        description=payload.description,
        raw_text=f"manual web: {payload.description}",
        date=tx_date
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx

@router.post("/transfer", response_model=TransferResponse)
def execute_transfer(
    payload: TransferCreate,
    db: Session = Depends(get_db)
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Nominal transfer harus lebih besar dari 0")
    if payload.from_account == payload.to_account:
        raise HTTPException(status_code=400, detail="Rekening asal dan tujuan tidak boleh sama")

    now_wib = datetime.now(WIB)
    tx_date = payload.date or now_wib.date()
    desc = payload.description or f"Transfer {payload.from_account} -> {payload.to_account}"

    tx_out = Transaction(
        type="transfer_out",
        amount=payload.amount,
        account=payload.from_account,
        category="Transfer",
        description=f"Transfer ke {payload.to_account}: {desc}",
        raw_text=f"transfer out: {payload.from_account} -> {payload.to_account} ({desc})",
        date=tx_date
    )
    tx_in = Transaction(
        type="transfer_in",
        amount=payload.amount,
        account=payload.to_account,
        category="Transfer",
        description=f"Transfer dari {payload.from_account}: {desc}",
        raw_text=f"transfer in: {payload.from_account} -> {payload.to_account} ({desc})",
        date=tx_date
    )

    db.add(tx_out)
    db.add(tx_in)
    db.commit()
    db.refresh(tx_out)
    db.refresh(tx_in)

    return TransferResponse(
        status="success",
        from_account=payload.from_account,
        to_account=payload.to_account,
        amount=payload.amount,
        out_transaction_id=tx_out.id,
        in_transaction_id=tx_in.id,
        date=tx_date
    )

@router.post("/paycheck", response_model=PaycheckResponse)
def execute_paycheck_split(
    payload: PaycheckRequest,
    db: Session = Depends(get_db)
):
    now_wib = datetime.now(WIB)
    cycle_start = payload.date or now_wib.date()
    cycle_end = cycle_start + timedelta(days=13)
    total = payload.total_amount

    # Standard Excel formula
    if total == 1500000:
        mandiri_amt = 825000
        jago_amt = 475000
        bri1_amt = 100000
        bri2_amt = 100000
    else:
        mandiri_amt = int(round(total * 0.55))
        jago_amt = int(round(total * 0.31666667))
        bri1_amt = int(round(total * 0.06666667))
        bri2_amt = total - (mandiri_amt + jago_amt + bri1_amt)

    allocations_plan = [
        {
            "account": "Mandiri",
            "amount": mandiri_amt,
            "percentage": round(mandiri_amt / total * 100, 1),
            "purpose": "Uang Saku Harian (Makan, Jajan, Laundry, Galon)",
            "desc": "Gajian (Alokasi Saku Harian Mandiri)",
        },
        {
            "account": "Bank Jago",
            "amount": jago_amt,
            "percentage": round(jago_amt / total * 100, 1),
            "purpose": "Langganan & Investasi Bibit",
            "desc": "Gajian (Alokasi Subs & Bibit Jago)",
        },
        {
            "account": "BRI 1",
            "amount": bri1_amt,
            "percentage": round(bri1_amt / total * 100, 1),
            "purpose": "Hub Gajian & Dana Darurat",
            "desc": "Gajian (Alokasi Dana Darurat BRI 1)",
        },
        {
            "account": "BRI 2",
            "amount": bri2_amt,
            "percentage": round(bri2_amt / total * 100, 1),
            "purpose": "Tabungan Terkunci",
            "desc": "Gajian (Alokasi Tabungan Kunci BRI 2)",
        },
    ]

    created_txs = []
    for item in allocations_plan:
        tx = Transaction(
            type="income",
            amount=item["amount"],
            account=item["account"],
            category="Uang Saku Ortu",
            description=item["desc"],
            raw_text=f"paycheck-split: total {total} -> {item['account']} {item['amount']}",
            date=cycle_start
        )
        db.add(tx)
        created_txs.append(tx)

    db.commit()
    for tx in created_txs:
        db.refresh(tx)

    return PaycheckResponse(
        success=True,
        total_amount=total,
        cycle_start=cycle_start,
        cycle_end=cycle_end,
        allocations=[
            PaycheckAllocationItem(
                account=item["account"],
                amount=item["amount"],
                percentage=item["percentage"],
                purpose=item["purpose"]
            )
            for item in allocations_plan
        ],
        created_transactions=created_txs
    )

@router.delete("/{tx_id}")
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return {"success": True, "deleted_id": tx_id}

@router.get("/export")
def export_csv(
    month: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)
    if month:
        yr, mo = map(int, month.split("-"))
        start_date = date(yr, mo, 1)
        end_date = date(yr + 1, 1, 1) if mo == 12 else date(yr, mo + 1, 1)
        query = query.filter(Transaction.date >= start_date, Transaction.date < end_date)
        filename = f"finance_{month}.csv"
    else:
        filename = "finance_all.csv"

    rows = query.order_by(desc(Transaction.date), desc(Transaction.id)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Tanggal", "Tipe", "Kategori", "Rekening", "Nominal", "Keterangan", "Waktu"])
    for r in rows:
        writer.writerow([r.id, r.date, r.type, r.category, r.account, r.amount, r.description, r.created_at])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
