#!/usr/bin/env python3
"""
One-Time Data Migration Script:
Syncs distinct transaction categories from the transactions table into the categories table
for all active users in the database, with automatic default seed preservation.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.category import Category
from app.api.v1.endpoints.categories import (
    ensure_default_categories,
    sync_transaction_categories,
)


def run_migration():
    db = SessionLocal()
    print("=" * 70)
    print("AI7 FINANCE: TRANSACTION CATEGORIES TO CATEGORIES TABLE MIGRATION")
    print("=" * 70)

    try:
        active_users = db.query(User).filter(User.is_active == True).order_by(User.id.asc()).all()
        print(f"Found {len(active_users)} active user(s).\n")

        total_synced = 0
        for user in active_users:
            pre_count = db.query(Category).filter(Category.user_id == user.id).count()

            # Ensure default categories if none exist
            ensure_default_categories(db, user.id)
            post_default_count = db.query(Category).filter(Category.user_id == user.id).count()

            # Sync transaction categories
            synced_count = sync_transaction_categories(db, user.id)
            total_count = db.query(Category).filter(Category.user_id == user.id).count()
            total_synced += synced_count

            print(
                f"[User ID: {user.id:2d} | @{user.username}] "
                f"Initial: {pre_count:2d} -> "
                f"After Defaults: {post_default_count:2d} -> "
                f"New Synced: +{synced_count:2d} -> "
                f"Total Categories: {total_count:2d}"
            )

            # List active categories for user
            cats = db.query(Category).filter(Category.user_id == user.id).order_by(Category.type.asc(), Category.name.asc()).all()
            cat_summary = ", ".join([f"{c.name} ({c.type})" for c in cats])
            print(f"   Categories: {cat_summary}\n")

        print("=" * 70)
        print(f"Migration completed successfully. Total new categories synced: {total_synced}")
        print("=" * 70)

    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Migration failed: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
