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
from app.schemas.account import SUPPORTED_ACCOUNT_TYPES, PROTECTED_ACCOUNT_TYPES
from app.services.analytics import resolve_pocket_account, is_account_protected
from app.api.deps import get_current_user
from main import app

# Isolated SQLite in-memory database
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
        username="alif_tester",
        hashed_password="hashed_secret_test",
        telegram_chat_id=999888,
        full_name="Alif Specialist",
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
# 1. Verification of Account Creation with Roles (tagihan, gajian, darurat, etc.)
# ============================================================================

def test_create_account_tagihan_and_gajian(client, test_user):
    """Verifies that accounts with roles 'tagihan' and 'gajian' can be created seamlessly."""
    # Create 'tagihan' account
    resp_tagihan = client.post(
        "/api/v1/accounts",
        json={
            "name": "Kantong Tagihan Rutin",
            "type": "tagihan",
            "tag": "Autodebet & Subs",
            "color": "purpleLock",
            "initial_balance": 150000,
        },
    )
    assert resp_tagihan.status_code == 201
    data_tagihan = resp_tagihan.json()
    assert data_tagihan["name"] == "Kantong Tagihan Rutin"
    assert data_tagihan["type"] == "tagihan"
    assert data_tagihan["tag"] == "Autodebet & Subs"
    assert data_tagihan["current_balance"] == 150000

    # Create 'gajian' account
    resp_gajian = client.post(
        "/api/v1/accounts",
        json={
            "name": "BCA Payroll Utama",
            "type": "gajian",
            "tag": "Penampung Gaji Pokok",
            "color": "amberGold",
            "initial_balance": 5000000,
        },
    )
    assert resp_gajian.status_code == 201
    data_gajian = resp_gajian.json()
    assert data_gajian["name"] == "BCA Payroll Utama"
    assert data_gajian["type"] == "gajian"
    assert data_gajian["tag"] == "Penampung Gaji Pokok"
    assert data_gajian["current_balance"] == 5000000


def test_create_all_supported_financial_roles(client, test_user):
    """Verifies all defined roles: operasional, tagihan, gajian, tabungan, investasi, darurat, ewallet."""
    roles = ["operasional", "tagihan", "gajian", "tabungan", "investasi", "darurat", "ewallet"]
    for role in roles:
        resp = client.post(
            "/api/v1/accounts",
            json={
                "name": f"Akun Pos {role.capitalize()}",
                "type": role,
                "tag": f"Tag {role}",
                "color": "teal",
                "initial_balance": 0,
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == role


# ============================================================================
# 2. Verification of Account Updating with Roles
# ============================================================================

def test_update_account_to_tagihan_and_gajian(client, db_session, test_user):
    """Verifies updating an existing account's role to tagihan, gajian, and case-normalization."""
    acc = Account(
        user_id=test_user.id,
        name="Rekening Fleksibel",
        type="operasional",
        color="amberGold",
        initial_balance=0,
    )
    db_session.add(acc)
    db_session.commit()
    db_session.refresh(acc)

    # 1. Update to 'tagihan'
    resp_update1 = client.put(
        f"/api/v1/accounts/{acc.id}",
        json={"type": "tagihan", "tag": "Pos Khusus Tagihan"},
    )
    assert resp_update1.status_code == 200
    assert resp_update1.json()["type"] == "tagihan"

    # 2. Update to 'gajian'
    resp_update2 = client.put(
        f"/api/v1/accounts/{acc.id}",
        json={"type": "gajian"},
    )
    assert resp_update2.status_code == 200
    assert resp_update2.json()["type"] == "gajian"

    # 3. Update with uppercase and whitespace padding ("  DARURAT  ")
    resp_update3 = client.put(
        f"/api/v1/accounts/{acc.id}",
        json={"type": "  DARURAT  "},
    )
    assert resp_update3.status_code == 200
    assert resp_update3.json()["type"] == "darurat"


# ============================================================================
# 3. Verification of Filtering Accounts by Role
# ============================================================================

def test_filter_accounts_by_role(client, db_session, test_user):
    """Verifies that GET /api/v1/accounts?type=<role> filters accounts precisely."""
    # Seed specific accounts
    acc_op = Account(user_id=test_user.id, name="Mandiri Saku", type="operasional", color="amberGold")
    acc_tag = Account(user_id=test_user.id, name="Jago Tagihan", type="tagihan", color="purpleLock")
    acc_gaj = Account(user_id=test_user.id, name="BCA Payroll", type="gajian", color="blue")
    acc_dar = Account(user_id=test_user.id, name="SeaBank Darurat", type="darurat", color="cyanHub")
    db_session.add_all([acc_op, acc_tag, acc_gaj, acc_dar])
    db_session.commit()

    # Filter by tagihan
    resp_tag = client.get("/api/v1/accounts?type=tagihan")
    assert resp_tag.status_code == 200
    names_tag = [a["name"] for a in resp_tag.json()]
    assert "Jago Tagihan" in names_tag
    assert "Mandiri Saku" not in names_tag
    assert "BCA Payroll" not in names_tag

    # Filter by gajian
    resp_gaj = client.get("/api/v1/accounts?type=gajian")
    assert resp_gaj.status_code == 200
    names_gaj = [a["name"] for a in resp_gaj.json()]
    assert "BCA Payroll" in names_gaj
    assert "Jago Tagihan" not in names_gaj

    # Filter case-insensitive ("TAGIHAN")
    resp_tag_upper = client.get("/api/v1/accounts?type=TAGIHAN")
    assert resp_tag_upper.status_code == 200
    assert len(resp_tag_upper.json()) == len(resp_tag.json())

    # Filter type=all returns all accounts
    resp_all = client.get("/api/v1/accounts?type=all")
    assert resp_all.status_code == 200
    assert len(resp_all.json()) >= 4


# ============================================================================
# 4. Safe-to-Spend Protection of Financial Roles (Analytics Protection)
# ============================================================================

def test_safe_to_spend_protects_tagihan_and_savings_from_daily_burn(client, db_session, test_user):
    """
    Pastikan akun bertipe tagihan, tabungan, investasi, dan darurat diproteksi
    dari pengurangan safe-to-spend belanja konsumtif, kecuali jika user secara
    spesifik mencatat pengeluaran di akun tersebut.
    """
    today = date.today()

    # Create Operational Pocket Account (Pocket budget: 2.000.000)
    acc_op = Account(
        user_id=test_user.id,
        name="Mandiri Utama",
        type="operasional",
        initial_balance=0,
    )
    # Create Billing Autodebet Account (Tagihan)
    acc_tag = Account(
        user_id=test_user.id,
        name="Jago Tagihan",
        type="tagihan",
        initial_balance=0,
    )
    # Create Emergency Fund Account (Darurat)
    acc_dar = Account(
        user_id=test_user.id,
        name="Dana Darurat",
        type="darurat",
        initial_balance=0,
    )
    db_session.add_all([acc_op, acc_tag, acc_dar])

    # PaycheckConfig pointing pocket_account to Mandiri Utama
    cfg = PaycheckConfig(
        user_id=test_user.id,
        pocket_account="Mandiri Utama",
        cycle_days=30,
        cycle_start_date=today,
    )
    db_session.add(cfg)

    # Income into Mandiri Utama: 2.000.000 (Defines pocket_budget)
    tx_inc = Transaction(
        user_id=test_user.id,
        type="income",
        account="Mandiri Utama",
        amount=2000000,
        category="Gajian",
        description="Alokasi Saku Belanja",
        date=today,
    )

    # Expense 1: Consumptive operational expense on Mandiri Utama (200.000)
    tx_exp_op = Transaction(
        user_id=test_user.id,
        type="expense",
        account="Mandiri Utama",
        amount=200000,
        category="Makanan & Minuman",
        description="Makan Siang Resto",
        date=today,
    )

    # Expense 2: Large routine bill on Jago Tagihan (800.000) -> MUST NOT deduct safe-to-spend!
    tx_exp_tag = Transaction(
        user_id=test_user.id,
        type="expense",
        account="Jago Tagihan",
        amount=800000,
        category="Tagihan",
        description="Autodebet Cicilan & Subscription",
        date=today,
    )

    # Expense 3: Emergency medical expense on Dana Darurat (500.000) -> MUST NOT deduct safe-to-spend!
    tx_exp_dar = Transaction(
        user_id=test_user.id,
        type="expense",
        account="Dana Darurat",
        amount=500000,
        category="Kesehatan",
        description="Klinik Darurat",
        date=today,
    )

    db_session.add_all([tx_inc, tx_exp_op, tx_exp_tag, tx_exp_dar])
    db_session.commit()

    # Query analytics summary
    resp = client.get("/api/v1/analytics/summary?period_type=cycle")
    assert resp.status_code == 200
    data = resp.json()

    safe = data["safe_to_spend"]
    assert safe is not None
    assert safe["pocket_account"] == "Mandiri Utama"
    assert safe["pocket_budget"] == 2000000

    # pocket_spent MUST be exactly 200.000 (only Mandiri Utama).
    # The 800.000 from Jago Tagihan and 500.000 from Dana Darurat are protected!
    assert safe["pocket_spent"] == 200000
    assert safe["pocket_remaining"] == 1800000


def test_analytics_service_unit_functions(db_session, test_user):
    """Direct unit test of analytics service protection helpers."""
    # Test is_account_protected
    assert is_account_protected("tagihan") is True
    assert is_account_protected("tabungan") is True
    assert is_account_protected("investasi") is True
    assert is_account_protected("darurat") is True
    assert is_account_protected("operasional") is False
    assert is_account_protected("gajian") is False
    assert is_account_protected("ewallet") is False

    # Test resolve_pocket_account priority
    # Setup accounts: 1 gajian, 1 tagihan, 1 operasional
    acc_gaj = Account(user_id=test_user.id, name="Bank Payroll", type="gajian")
    acc_tag = Account(user_id=test_user.id, name="Bank Tagihan", type="tagihan")
    acc_op = Account(user_id=test_user.id, name="Bank Saku Harian", type="operasional")
    db_session.add_all([acc_gaj, acc_tag, acc_op])
    db_session.commit()

    resolved = resolve_pocket_account(db_session, test_user.id)
    # Operasional must be resolved, not the protected tagihan or gajian
    assert resolved == "Bank Saku Harian"
