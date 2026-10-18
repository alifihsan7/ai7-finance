import sqlite3
import os
from datetime import datetime
import zoneinfo

DB_PATH = os.path.expanduser("/home/alifihsan/ai7-finance/finance.db")
WIB = zoneinfo.ZoneInfo("Asia/Jakarta")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,           -- 'expense' or 'income'
                amount INTEGER NOT NULL,
                account TEXT NOT NULL,        -- 'BCA', 'GoPay', 'Cash', etc.
                category TEXT NOT NULL,       -- 'Makanan & Minuman', etc.
                description TEXT NOT NULL,
                raw_text TEXT,
                date TEXT NOT NULL,           -- YYYY-MM-DD (WIB)
                created_at TEXT NOT NULL      -- Full timestamp (WIB)
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_date ON transactions(date)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_account ON transactions(account)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_category ON transactions(category)")
    conn.close()

def add_transaction(tx_data: dict) -> dict:
    now_wib = datetime.now(WIB)
    date_str = now_wib.strftime("%Y-%m-%d")
    created_at = now_wib.strftime("%Y-%m-%d %H:%M:%S")

    conn = get_connection()
    with conn:
        cursor = conn.execute("""
            INSERT INTO transactions (type, amount, account, category, description, raw_text, date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tx_data["type"],
            tx_data["amount"],
            tx_data["account"],
            tx_data["category"],
            tx_data["description"],
            tx_data.get("raw_text", ""),
            date_str,
            created_at
        ))
        tx_id = cursor.lastrowid
    conn.close()

    return {
        "id": tx_id,
        "type": tx_data["type"],
        "amount": tx_data["amount"],
        "account": tx_data["account"],
        "category": tx_data["category"],
        "description": tx_data["description"],
        "created_at": created_at,
        "date": date_str
    }

def get_recent_transactions(limit: int = 5):
    conn = get_connection()
    rows = conn.execute("""
        SELECT * FROM transactions ORDER BY id DESC LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_last_transaction():
    conn = get_connection()
    with conn:
        row = conn.execute("SELECT * FROM transactions ORDER BY id DESC LIMIT 1").fetchone()
        if not row:
            conn.close()
            return None
        tx = dict(row)
        conn.execute("DELETE FROM transactions WHERE id = ?", (tx["id"],))
    conn.close()
    return tx

def get_monthly_summary(year: int = None, month: int = None):
    now_wib = datetime.now(WIB)
    if year is None:
        year = now_wib.year
    if month is None:
        month = now_wib.month

    month_str = f"{year:04d}-{month:02d}%"

    conn = get_connection()
    # Totals
    totals = conn.execute("""
        SELECT 
            type,
            SUM(amount) as total
        FROM transactions
        WHERE date LIKE ?
        GROUP BY type
    """, (month_str,)).fetchall()

    income_total = 0
    expense_total = 0
    for r in totals:
        if r["type"] == "income":
            income_total = r["total"] or 0
        elif r["type"] == "expense":
            expense_total = r["total"] or 0

    # Expense by category
    cat_breakdown = conn.execute("""
        SELECT 
            category,
            SUM(amount) as total,
            COUNT(*) as count
        FROM transactions
        WHERE date LIKE ? AND type = 'expense'
        GROUP BY category
        ORDER BY total DESC
    """, (month_str,)).fetchall()

    conn.close()

    return {
        "year": year,
        "month": month,
        "income": income_total,
        "expense": expense_total,
        "net": income_total - expense_total,
        "categories": [dict(r) for r in cat_breakdown]
    }

def get_balances():
    conn = get_connection()
    rows = conn.execute("""
        SELECT 
            account,
            SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
        FROM transactions
        GROUP BY account
        ORDER BY balance DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]
