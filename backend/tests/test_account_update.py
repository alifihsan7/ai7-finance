import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.paycheck import PaycheckConfig, PaycheckBucket
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
        is_active=True
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
        is_active=True
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


def test_update_account_metadata_only(client, db_session, test_user):
    account = Account(
        user_id=test_user.id,
        name="Rekening Tabungan",
        type="tabungan",
        tag="Tag Asli",
        color="blue",
        initial_balance=100000
    )
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)

    response = client.put(
        f"/api/v1/accounts/{account.id}",
        json={
            "tag": "Tag Baru",
            "color": "emerald",
            "type": "operasional"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == account.id
    assert data["name"] == "Rekening Tabungan"
    assert data["tag"] == "Tag Baru"
    assert data["color"] == "emerald"
    assert data["type"] == "operasional"


def test_update_account_name_and_cascade_transactions(client, db_session, test_user):
    # Setup account
    account = Account(
        user_id=test_user.id,
        name="BCA Lama",
        type="operasional",
        tag="Utama",
        color="amberGold",
        initial_balance=0
    )
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)

    # Setup transactions associated with this account
    tx1 = Transaction(
        user_id=test_user.id,
        type="income",
        amount=5000000,
        account="BCA Lama",
        category="Gaji",
        description="Gaji Bulanan",
        date=date(2026, 10, 1)
    )
    tx2 = Transaction(
        user_id=test_user.id,
        type="expense",
        amount=1500000,
        account="BCA Lama",
        category="Sewa",
        description="Bayar Kost",
        date=date(2026, 10, 2)
    )
    db_session.add_all([tx1, tx2])

    # Setup PaycheckConfig and PaycheckBucket referencing old account
    cfg = PaycheckConfig(
        user_id=test_user.id,
        source_account="BCA Lama",
        pocket_account="BCA Lama"
    )
    db_session.add(cfg)
    db_session.commit()
    db_session.refresh(cfg)

    bucket = PaycheckBucket(
        config_id=cfg.id,
        account="BCA Lama",
        percentage=20.0,
        purpose="Tabungan"
    )
    db_session.add(bucket)
    db_session.commit()

    # Perform PUT request to rename
    response = client.put(
        f"/api/v1/accounts/{account.id}",
        json={"name": "BCA Baru"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "BCA Baru"
    assert data["current_balance"] == 3500000  # 5,000,000 - 1,500,000

    # Verify transactions cascaded
    db_session.expire_all()
    updated_txs = db_session.query(Transaction).filter(Transaction.user_id == test_user.id).all()
    assert len(updated_txs) == 2
    for t in updated_txs:
        assert t.account == "BCA Baru"

    # Verify PaycheckConfig & PaycheckBucket cascaded
    db_session.refresh(cfg)
    assert cfg.source_account == "BCA Baru"
    assert cfg.main_income_account == "BCA Baru"
    assert cfg.pocket_account == "BCA Baru"

    db_session.refresh(bucket)
    assert bucket.account == "BCA Baru"


def test_update_account_duplicate_name_conflict(client, db_session, test_user):
    acc1 = Account(user_id=test_user.id, name="Mandiri", type="operasional", color="amberGold")
    acc2 = Account(user_id=test_user.id, name="BCA", type="operasional", color="amberGold")
    db_session.add_all([acc1, acc2])
    db_session.commit()

    response = client.put(
        f"/api/v1/accounts/{acc2.id}",
        json={"name": "mandiri"}  # Case-insensitive duplicate check
    )
    assert response.status_code == 400
    assert "sudah terdaftar" in response.json()["detail"]


def test_update_account_empty_name(client, db_session, test_user):
    account = Account(user_id=test_user.id, name="Jago", type="operasional", color="amberGold")
    db_session.add(account)
    db_session.commit()

    response = client.put(
        f"/api/v1/accounts/{account.id}",
        json={"name": "   "}
    )
    assert response.status_code == 400
    assert "Nama rekening tidak boleh kosong" in response.json()["detail"]


def test_update_account_not_found(client, db_session):
    response = client.put(
        "/api/v1/accounts/99999",
        json={"name": "Non Existent"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Rekening tidak ditemukan"


def test_update_account_cross_user_isolation(client, db_session, other_user):
    # Account belonging to other_user (id=2)
    account = Account(
        user_id=other_user.id,
        name="Rekening Rahasia",
        type="operasional",
        color="purpleLock"
    )
    db_session.add(account)
    db_session.commit()

    # Client is authenticated as test_user (id=1)
    response = client.put(
        f"/api/v1/accounts/{account.id}",
        json={"name": "Hack Name"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Rekening tidak ditemukan"


def test_update_account_same_name_different_case(client, db_session, test_user):
    account = Account(
        user_id=test_user.id,
        name="Mandiri",
        type="operasional",
        color="amberGold"
    )
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)

    # Renaming to MANDIRI should not trigger self duplicate conflict
    response = client.put(
        f"/api/v1/accounts/{account.id}",
        json={"name": "MANDIRI"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "MANDIRI"


def test_update_account_trims_whitespace(client, db_session, test_user):
    account = Account(
        user_id=test_user.id,
        name="Bank Jago",
        type="operasional",
        color="purpleLock"
    )
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)

    response = client.put(
        f"/api/v1/accounts/{account.id}",
        json={"name": "   Jago Baru   "}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Jago Baru"


def test_cascade_does_not_affect_other_users(client, db_session, test_user, other_user):
    # Both users happen to have an account with the same name "SharedName"
    acc1 = Account(user_id=test_user.id, name="SharedName", type="operasional", color="amberGold")
    acc2 = Account(user_id=other_user.id, name="SharedName", type="operasional", color="amberGold")
    db_session.add_all([acc1, acc2])
    db_session.commit()

    tx1 = Transaction(
        user_id=test_user.id,
        type="income",
        amount=1000,
        account="SharedName",
        category="Gaji",
        description="Gaji User 1",
        date=date(2026, 10, 1)
    )
    tx2 = Transaction(
        user_id=other_user.id,
        type="income",
        amount=2000,
        account="SharedName",
        category="Gaji",
        description="Gaji User 2",
        date=date(2026, 10, 1)
    )
    db_session.add_all([tx1, tx2])
    db_session.commit()

    response = client.put(
        f"/api/v1/accounts/{acc1.id}",
        json={"name": "RenamedByUserOne"}
    )
    assert response.status_code == 200

    db_session.expire_all()
    db_session.refresh(tx1)
    db_session.refresh(tx2)

    assert tx1.account == "RenamedByUserOne"
    assert tx2.account == "SharedName"  # Other user's transaction untouched!
