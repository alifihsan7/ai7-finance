import io
import csv
from typing import Optional, List
from datetime import datetime, date
import zoneinfo

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionOut
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
