import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.subscription import Subscription
from app.models.goal import Goal
from app.api.deps import get_current_user
from main import app

# In-memory SQLite for isolated, fast, deterministic testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(db_session):
    user = User(
        id=1,
        username="testuser",
        hashed_password="dummy_hashed_password",
        telegram_chat_id=123456,
        full_name="Test User",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def other_user(db_session):
    user = User(
        id=2,
        username="otheruser",
        hashed_password="dummy_hashed_password",
        telegram_chat_id=654321,
        full_name="Other User",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def client(test_user, db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ============================================================================
# 1. BOOTSTRAP & LIST CATEGORIES
# ============================================================================

def test_bootstrap_and_list_categories(client, db_session, test_user):
    # Initial state: no categories for test_user
    count = db_session.query(Category).filter(Category.user_id == test_user.id).count()
    assert count == 0

    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) >= 8

    # Verify default names exist
    cat_names = [c["name"] for c in categories]
    for expected in ["Makan", "Transport", "Tagihan", "Belanja", "Hiburan", "Tabungan", "Gaji"]:
        assert expected in cat_names

    # Ensure calling again does not re-seed / duplicate
    response2 = client.get("/api/v1/categories")
    assert response2.status_code == 200
    assert len(response2.json()) == len(categories)


def test_filter_categories_by_type(client, test_user):
    # Expense only
    res_exp = client.get("/api/v1/categories?type=expense")
    assert res_exp.status_code == 200
    exp_cats = res_exp.json()
    assert len(exp_cats) > 0
    assert all(c["type"] == "expense" for c in exp_cats)

    # Income only
    res_inc = client.get("/api/v1/categories?type=income")
    assert res_inc.status_code == 200
    inc_cats = res_inc.json()
    assert len(inc_cats) > 0
    assert all(c["type"] == "income" for c in inc_cats)


# ============================================================================
# 2. CREATE CATEGORY & DUPLICATE REJECTION
# ============================================================================

def test_create_category_success(client, db_session, test_user):
    payload = {
        "name": "Pendidikan",
        "type": "expense",
        "color": "cyanHub",
        "icon": "GraduationCap",
    }
    response = client.post("/api/v1/categories", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Pendidikan"
    assert data["type"] == "expense"
    assert data["color"] == "cyanHub"
    assert data["icon"] == "GraduationCap"
    assert "id" in data

    # Verify in DB
    cat = db_session.query(Category).filter(Category.id == data["id"]).first()
    assert cat is not None
    assert cat.user_id == test_user.id
    assert cat.name == "Pendidikan"


def test_create_category_empty_name(client):
    response = client.post("/api/v1/categories", json={"name": "   ", "type": "expense"})
    assert response.status_code == 400
    assert "tidak boleh kosong" in response.json()["detail"].lower()


def test_create_category_invalid_type(client):
    response = client.post("/api/v1/categories", json={"name": "Kripto", "type": "asset"})
    assert response.status_code == 400
    assert "tipe kategori harus 'expense' atau 'income'" in response.json()["detail"].lower()


def test_create_category_duplicate_rejection(client):
    client.post("/api/v1/categories", json={"name": "Kucing", "type": "expense"})

    # Duplicate with same case
    res1 = client.post("/api/v1/categories", json={"name": "Kucing", "type": "expense"})
    assert res1.status_code == 400
    assert "sudah terdaftar" in res1.json()["detail"]

    # Duplicate case-insensitive
    res2 = client.post("/api/v1/categories", json={"name": "kucing", "type": "expense"})
    assert res2.status_code == 400
    assert "sudah terdaftar" in res2.json()["detail"]

    # Same name but DIFFERENT type is allowed
    res3 = client.post("/api/v1/categories", json={"name": "Kucing", "type": "income"})
    assert res3.status_code == 201
    assert res3.json()["type"] == "income"


# ============================================================================
# 3. UPDATE CATEGORY & CASCADE UPDATE TO TRANSACTIONS
# ============================================================================

def test_update_category_metadata_only(client, db_session, test_user):
    cat = Category(user_id=test_user.id, name="Olahraga", type="expense", color="blue", icon="Activity")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    response = client.put(
        f"/api/v1/categories/{cat.id}",
        json={"color": "coralFall", "icon": "Dumbbell"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Olahraga"
    assert data["color"] == "coralFall"
    assert data["icon"] == "Dumbbell"


def test_update_category_name_and_cascade_transactions(client, db_session, test_user):
    cat = Category(user_id=test_user.id, name="Makan Siang", type="expense", color="amberGold")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    # Add transactions with old category name
    tx1 = Transaction(
        user_id=test_user.id,
        type="expense",
        amount=50000,
        account="BCA",
        category="Makan Siang",
        description="Nasi Padang",
        date=date(2026, 10, 15),
    )
    tx2 = Transaction(
        user_id=test_user.id,
        type="expense",
        amount=35000,
        account="Cash",
        category="Makan Siang",
        description="Ayam Geprek",
        date=date(2026, 10, 16),
    )
    sub = Subscription(
        user_id=test_user.id,
        name="Katering Harian",
        amount=600000,
        category="Makan Siang",
        account="BCA",
    )
    goal = Goal(
        user_id=test_user.id,
        name="Dana Kuliner",
        target_amount=1000000,
        category="Makan Siang",
    )
    db_session.add_all([tx1, tx2, sub, goal])
    db_session.commit()

    # Update category name
    response = client.put(
        f"/api/v1/categories/{cat.id}",
        json={"name": "Kuliner & Resto"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Kuliner & Resto"

    # Verify category updated
    db_session.refresh(cat)
    assert cat.name == "Kuliner & Resto"

    # Verify transactions cascaded
    db_session.refresh(tx1)
    db_session.refresh(tx2)
    assert tx1.category == "Kuliner & Resto"
    assert tx2.category == "Kuliner & Resto"

    # Verify subscription & goal cascaded
    db_session.refresh(sub)
    db_session.refresh(goal)
    assert sub.category == "Kuliner & Resto"
    assert goal.category == "Kuliner & Resto"


def test_update_category_duplicate_conflict(client, db_session, test_user):
    cat1 = Category(user_id=test_user.id, name="Kopi", type="expense", color="amberGold")
    cat2 = Category(user_id=test_user.id, name="Snack", type="expense", color="pink")
    db_session.add_all([cat1, cat2])
    db_session.commit()

    # Rename cat2 to "Kopi" (conflict)
    response = client.put(f"/api/v1/categories/{cat2.id}", json={"name": "kopi"})
    assert response.status_code == 400
    assert "sudah terdaftar" in response.json()["detail"]

    # Rename cat1 to "KOPI" (same category, different case: should succeed)
    res_same = client.put(f"/api/v1/categories/{cat1.id}", json={"name": "KOPI"})
    assert res_same.status_code == 200
    assert res_same.json()["name"] == "KOPI"


def test_update_category_not_found(client):
    response = client.put("/api/v1/categories/99999", json={"name": "Ghost"})
    assert response.status_code == 404
    assert "tidak ditemukan" in response.json()["detail"].lower()


# ============================================================================
# 4. DELETE CATEGORY & TRANSACTION PROTECTION / FALLBACK
# ============================================================================

def test_delete_category_without_transactions(client, db_session, test_user):
    cat = Category(user_id=test_user.id, name="UnusedCat", type="expense", color="teal")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    response = client.delete(f"/api/v1/categories/{cat.id}")
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Confirm removed from DB
    deleted = db_session.query(Category).filter(Category.id == cat.id).first()
    assert deleted is None


def test_delete_category_with_transactions_blocked_without_fallback(client, db_session, test_user):
    cat = Category(user_id=test_user.id, name="Internet", type="expense", color="purpleLock")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    tx = Transaction(
        user_id=test_user.id,
        type="expense",
        amount=350000,
        account="BCA",
        category="Internet",
        description="WiFi Indihome",
        date=date(2026, 10, 1),
    )
    db_session.add(tx)
    db_session.commit()

    # Attempt delete without fallback
    response = client.delete(f"/api/v1/categories/{cat.id}")
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "sedang digunakan oleh 1 transaksi" in detail
    assert "fallback_to" in detail

    # Category and tx still exist
    assert db_session.query(Category).filter(Category.id == cat.id).first() is not None
    assert db_session.query(Transaction).filter(Transaction.category == "Internet").first() is not None


def test_delete_category_with_fallback(client, db_session, test_user):
    cat = Category(user_id=test_user.id, name="Buku", type="expense", color="mintRise")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    tx = Transaction(
        user_id=test_user.id,
        type="expense",
        amount=120000,
        account="BCA",
        category="Buku",
        description="Buku Algoritma",
        date=date(2026, 10, 5),
    )
    db_session.add(tx)
    db_session.commit()

    # Delete with fallback to "Lainnya"
    response = client.delete(f"/api/v1/categories/{cat.id}?fallback_to=Lainnya")
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Cat "Buku" is deleted
    assert db_session.query(Category).filter(Category.id == cat.id).first() is None

    # Tx is reallocated to "Lainnya"
    db_session.refresh(tx)
    assert tx.category == "Lainnya"

    # Category "Lainnya" exists in DB for this user
    fallback_cat = db_session.query(Category).filter(
        Category.user_id == test_user.id,
        Category.name == "Lainnya"
    ).first()
    assert fallback_cat is not None


def test_delete_category_fallback_to_same_rejected(client, db_session, test_user):
    cat = Category(user_id=test_user.id, name="Game", type="expense", color="coralFall")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)

    tx = Transaction(
        user_id=test_user.id,
        type="expense",
        amount=50000,
        account="BCA",
        category="Game",
        description="Steam Game",
        date=date(2026, 10, 5),
    )
    db_session.add(tx)
    db_session.commit()

    response = client.delete(f"/api/v1/categories/{cat.id}?fallback_to=game")
    assert response.status_code == 400
    assert "tidak boleh sama" in response.json()["detail"].lower()


def test_delete_category_not_found(client):
    response = client.delete("/api/v1/categories/99999")
    assert response.status_code == 404


# ============================================================================
# 5. MULTI-USER TENANT ISOLATION
# ============================================================================

def test_multi_user_tenant_isolation(client, db_session, test_user, other_user):
    # Other user has category "Rahasia"
    cat_other = Category(user_id=other_user.id, name="Rahasia", type="expense", color="purpleLock")
    db_session.add(cat_other)

    # Other user has a transaction under "SharedCat"
    tx_other = Transaction(
        user_id=other_user.id,
        type="expense",
        amount=100000,
        account="Cash",
        category="SharedCat",
        description="User 2 Tx",
        date=date(2026, 10, 1),
    )

    # Test user also has "SharedCat"
    cat_test = Category(user_id=test_user.id, name="SharedCat", type="expense", color="amberGold")
    tx_test = Transaction(
        user_id=test_user.id,
        type="expense",
        amount=200000,
        account="Cash",
        category="SharedCat",
        description="User 1 Tx",
        date=date(2026, 10, 2),
    )
    db_session.add_all([tx_other, cat_test, tx_test])
    db_session.commit()

    # 1. Test user cannot update or delete other user's category (404)
    res_update = client.put(f"/api/v1/categories/{cat_other.id}", json={"name": "Hacked"})
    assert res_update.status_code == 404

    res_delete = client.delete(f"/api/v1/categories/{cat_other.id}")
    assert res_delete.status_code == 404

    # 2. Test user renaming "SharedCat" to "PersonalCat" only affects test user's transactions
    res_rename = client.put(f"/api/v1/categories/{cat_test.id}", json={"name": "PersonalCat"})
    assert res_rename.status_code == 200

    db_session.refresh(tx_test)
    db_session.refresh(tx_other)
    assert tx_test.category == "PersonalCat"
    assert tx_other.category == "SharedCat"  # Other user transaction untouched!

    # 3. Test user deleting their category with fallback does not affect other user
    res_del = client.delete(f"/api/v1/categories/{cat_test.id}?fallback_to=FallbackUser1")
    assert res_del.status_code == 200

    db_session.refresh(tx_other)
    assert tx_other.category == "SharedCat"  # Still untouched!
