import os
import io
import csv
from datetime import datetime
import zoneinfo
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import db

app = FastAPI(title="AI7 Finance Dashboard")

WIB = zoneinfo.ZoneInfo("Asia/Jakarta")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
INDEX_PATH = os.path.join(STATIC_DIR, "index.html")

class TransactionCreate(BaseModel):
    type: str  # 'expense' or 'income'
    amount: int
    account: str
    category: str
    description: str
    date: Optional[str] = None

@app.get("/", response_class=HTMLResponse)
def serve_index():
    if os.path.exists(INDEX_PATH):
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h2>AI7 Finance Dashboard static files not found</h2>")

@app.get("/api/summary")
def get_summary(month: Optional[str] = Query(None, description="Format YYYY-MM")):
    now_wib = datetime.now(WIB)
    if not month:
        year = now_wib.year
        m_int = now_wib.month
        month_str = f"{year:04d}-{m_int:02d}"
    else:
        try:
            parts = month.split("-")
            year = int(parts[0])
            m_int = int(parts[1])
            month_str = f"{year:04d}-{m_int:02d}"
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid month format, use YYYY-MM")

    # Monthly income and expense
    summary = db.get_monthly_summary(year, m_int)
    
    # Calculate percentage for each category
    total_exp = summary["expense"]
    for cat in summary["categories"]:
        cat["percentage"] = round((cat["total"] / total_exp * 100), 1) if total_exp > 0 else 0

    # Account balances (cumulative across all time)
    balances = db.get_balances()
    total_balance = sum(b["balance"] for b in balances)

    # Daily trend in current month
    conn = db.get_connection()
    daily_rows = conn.execute("""
        SELECT 
            date,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        WHERE date LIKE ?
        GROUP BY date
        ORDER BY date ASC
    """, (f"{month_str}%",)).fetchall()
    conn.close()

    daily_trend = [dict(r) for r in daily_rows]

    savings_rate = round((summary["net"] / summary["income"] * 100), 1) if summary["income"] > 0 else 0

    return {
        "month": month_str,
        "year": year,
        "month_num": m_int,
        "income": summary["income"],
        "expense": summary["expense"],
        "net": summary["net"],
        "savings_rate": savings_rate,
        "categories": summary["categories"],
        "accounts": balances,
        "total_balance": total_balance,
        "daily_trend": daily_trend
    }

@app.get("/api/transactions")
def list_transactions(
    month: Optional[str] = None,
    category: Optional[str] = None,
    account: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    query = "SELECT * FROM transactions WHERE 1=1"
    params = []

    if month:
        query += " AND date LIKE ?"
        params.append(f"{month}%")
    if category and category != "all":
        query += " AND category = ?"
        params.append(category)
    if account and account != "all":
        query += " AND account = ?"
        params.append(account)
    if type and type != "all":
        query += " AND type = ?"
        params.append(type)
    if search:
        query += " AND (description LIKE ? OR raw_text LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    conn = db.get_connection()
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/transactions")
def create_transaction(item: TransactionCreate):
    now_wib = datetime.now(WIB)
    date_val = item.date or now_wib.strftime("%Y-%m-%d")
    tx_dict = {
        "type": item.type,
        "amount": item.amount,
        "account": item.account,
        "category": item.category,
        "description": item.description,
        "raw_text": f"manual web: {item.description}"
    }
    created = db.add_transaction(tx_dict)
    return {"success": True, "transaction": created}

@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: int):
    conn = db.get_connection()
    with conn:
        row = conn.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,)).fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Transaction not found")
        conn.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    conn.close()
    return {"success": True, "deleted_id": tx_id}

@app.get("/api/export")
def export_csv(month: Optional[str] = None):
    conn = db.get_connection()
    if month:
        rows = conn.execute("SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC, id DESC", (f"{month}%",)).fetchall()
        filename = f"finance_{month}.csv"
    else:
        rows = conn.execute("SELECT * FROM transactions ORDER BY date DESC, id DESC").fetchall()
        filename = "finance_all.csv"
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Tanggal", "Tipe", "Kategori", "Rekening", "Nominal", "Keterangan", "Waktu"])
    for r in rows:
        writer.writerow([r["id"], r["date"], r["type"], r["category"], r["account"], r["amount"], r["description"], r["created_at"]])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
