from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.subscription import Subscription
from app.models.goal import Goal
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.api.deps import get_current_user

router = APIRouter()

DEFAULT_CATEGORIES = [
    # Expense
    {"name": "Makan", "type": "expense", "color": "amberGold", "icon": "Utensils"},
    {"name": "Transport", "type": "expense", "color": "cyanHub", "icon": "Car"},
    {"name": "Tagihan", "type": "expense", "color": "purpleLock", "icon": "Receipt"},
    {"name": "Belanja", "type": "expense", "color": "pink", "icon": "ShoppingBag"},
    {"name": "Hiburan", "type": "expense", "color": "coralFall", "icon": "Film"},
    {"name": "Tabungan", "type": "expense", "color": "teal", "icon": "PiggyBank"},
    {"name": "Kesehatan", "type": "expense", "color": "mintRise", "icon": "HeartPulse"},
    {"name": "Lainnya", "type": "expense", "color": "slateText", "icon": "Tag"},
    # Income
    {"name": "Gaji", "type": "income", "color": "mintRise", "icon": "Wallet"},
    {"name": "Bonus", "type": "income", "color": "amberGold", "icon": "Gift"},
    {"name": "Investasi", "type": "income", "color": "teal", "icon": "TrendingUp"},
    {"name": "Pemasukan Lain", "type": "income", "color": "cyanHub", "icon": "PlusCircle"},
]


def ensure_default_categories(db: Session, user_id: int):
    has_category = db.query(Category).filter(Category.user_id == user_id).first()
    if not has_category:
        for d in DEFAULT_CATEGORIES:
            cat = Category(
                user_id=user_id,
                name=d["name"],
                type=d["type"],
                color=d["color"],
                icon=d["icon"],
            )
            db.add(cat)
        try:
            db.commit()
        except Exception:
            db.rollback()


@router.get("", response_model=List[CategoryResponse])
def get_categories(
    type: Optional[str] = Query(None, description="Filter kategori berdasarkan tipe: expense | income"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ensure_default_categories(db, current_user.id)

    query = db.query(Category).filter(Category.user_id == current_user.id)
    if type:
        clean_type = type.strip().lower()
        query = query.filter(Category.type == clean_type)

    return query.order_by(Category.id.asc()).all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    name_clean = category_in.name.strip()
    if not name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama kategori tidak boleh kosong"
        )

    cat_type = (category_in.type or "expense").strip().lower()
    if cat_type not in ("expense", "income"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipe kategori harus 'expense' atau 'income'"
        )

    # Cek duplikasi case-insensitive per user & type
    existing = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.type == cat_type,
        func.lower(Category.name) == name_clean.lower()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kategori '{name_clean}' dengan tipe '{cat_type}' sudah terdaftar"
        )

    new_cat = Category(
        user_id=current_user.id,
        name=name_clean,
        type=cat_type,
        color=category_in.color.strip() if category_in.color else "amberGold",
        icon=category_in.icon.strip() if category_in.icon else None,
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_in: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kategori tidak ditemukan"
        )

    old_name = cat.name
    new_name = category_in.name.strip() if category_in.name is not None else old_name
    if not new_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama kategori tidak boleh kosong"
        )

    new_type = cat.type
    if category_in.type is not None:
        new_type = category_in.type.strip().lower()
        if new_type not in ("expense", "income"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipe kategori harus 'expense' atau 'income'"
            )

    # Cek duplikasi jika nama atau tipe berubah
    if new_name != old_name or new_type != cat.type:
        existing = db.query(Category).filter(
            Category.user_id == current_user.id,
            Category.id != category_id,
            Category.type == new_type,
            func.lower(Category.name) == new_name.lower()
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kategori '{new_name}' dengan tipe '{new_type}' sudah terdaftar"
            )

    # Cascade update pada Transaction jika nama kategori berubah
    if new_name != old_name:
        db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.category == old_name
        ).update({Transaction.category: new_name}, synchronize_session=False)

        # Update juga Subscriptions & Goals bila ada yang memakai kategori lama
        db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.category == old_name
        ).update({Subscription.category: new_name}, synchronize_session=False)

        db.query(Goal).filter(
            Goal.user_id == current_user.id,
            Goal.category == old_name
        ).update({Goal.category: new_name}, synchronize_session=False)

    cat.name = new_name
    cat.type = new_type
    if category_in.color is not None:
        cat.color = category_in.color.strip()
    if category_in.icon is not None:
        cat.icon = category_in.icon.strip() if category_in.icon else None

    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    fallback_to: Optional[str] = Query(None, description="Nama kategori fallback jika ada transaksi terkait"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kategori tidak ditemukan"
        )

    cat_name = cat.name
    tx_count = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.category == cat_name
    ).count()

    target_fallback_name = None
    if tx_count > 0:
        if not fallback_to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kategori '{cat_name}' sedang digunakan oleh {tx_count} transaksi. "
                       f"Tentukan parameter 'fallback_to' (misal: 'Lainnya') untuk memindahkan transaksi, "
                       f"atau ubah transaksi terkait terlebih dahulu."
            )

        fallback_clean = fallback_to.strip()
        if not fallback_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kategori fallback tidak boleh kosong"
            )
        if fallback_clean.lower() == cat_name.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kategori fallback tidak boleh sama dengan kategori yang dihapus"
            )

        # Pastikan kategori fallback terdaftar di tabel categories untuk user ini
        target_cat = db.query(Category).filter(
            Category.user_id == current_user.id,
            Category.type == cat.type,
            func.lower(Category.name) == fallback_clean.lower()
        ).first()
        if not target_cat:
            target_cat = Category(
                user_id=current_user.id,
                name=fallback_clean,
                type=cat.type,
                color="slateText",
                icon="Tag"
            )
            db.add(target_cat)
            db.flush()

        target_fallback_name = target_cat.name

        # Cascade reassign transaksi ke target fallback
        db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.category == cat_name
        ).update({Transaction.category: target_cat.name}, synchronize_session=False)

        # Update juga Subscriptions & Goals bila ada yang memakai kategori yang dihapus
        db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.category == cat_name
        ).update({Subscription.category: target_cat.name}, synchronize_session=False)

        db.query(Goal).filter(
            Goal.user_id == current_user.id,
            Goal.category == cat_name
        ).update({Goal.category: target_cat.name}, synchronize_session=False)

    db.delete(cat)
    db.commit()

    if tx_count > 0 and target_fallback_name:
        return {
            "success": True,
            "message": f"Kategori '{cat_name}' berhasil dihapus dan {tx_count} transaksi dipindahkan ke '{target_fallback_name}'"
        }
    return {
        "success": True,
        "message": f"Kategori '{cat_name}' berhasil dihapus"
    }
