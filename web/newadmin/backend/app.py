import os
import json
import re
import shutil
from pathlib import Path
from uuid import uuid4
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env", override=True)

from fastapi import FastAPI, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, inspect, or_, text
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import models
import database
import product_catalog
from pydantic import BaseModel, Field
from chat_routes import router as chat_router
from iot_routes import router as iot_router
from services import auth_service, cart_service, wishlist_service, order_service

DEMO_ADMIN_ACCOUNT = {
    "id": "demo-admin",
    "name": "Admin User",
    "email": "admin@seraphine.com",
    "password": "password",
    "role": "Super Admin",
    "active": True,
    "source": "demo",
}

ROOT_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = ROOT_DIR / "assets"
IMAGE_UPLOAD_DIR = ASSETS_DIR / "img"
WEB_DIST_DIR = ROOT_DIR / "web" / "dist"
WEB_DIST_ASSETS_DIR = WEB_DIST_DIR / "web-assets"
WEB_INDEX_FILE = WEB_DIST_DIR / "index.html"
ADMIN_DIST_DIR = ROOT_DIR / "admin" / "dist"
ADMIN_INDEX_FILE = ADMIN_DIST_DIR / "index.html"
ADMIN_PUBLIC_PATH = "control-room"
IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
SHIPPING_SERVICE_FEES = {
    "jne-reg": 12.0,
    "jnt-express": 14.0,
    "sicepat-best": 16.0,
    "gosend-sameday": 28.0,
}
SHIPPING_SERVICE_LABELS = {
    "jne-reg": "JNE REG",
    "jnt-express": "J&T Express",
    "sicepat-best": "SiCepat BEST",
    "gosend-sameday": "GoSend Same Day",
}
PAYMENT_METHOD_LABELS = {
    "credit-card": "Credit Card",
    "bank-transfer": "Bank Transfer",
    "ewallet": "E-Wallet",
    "cod": "Cash on Delivery",
}
ALLOWED_ORDER_STATUSES = {"pending", "paid", "shipped", "completed", "cancelled"}


def parse_csv_env(value: str | None):
    return [item.strip() for item in (value or '').split(',') if item.strip()]


default_cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3101",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]
extra_cors_origins = parse_csv_env(os.getenv("CORS_ALLOWED_ORIGINS"))
cors_origin_regex = os.getenv(
    "CORS_ALLOWED_ORIGIN_REGEX",
    r"https?://((localhost|127\.0\.0\.1)(:\d+)?|([a-z0-9-]+\.)?(ngrok-free\.app|ngrok\.app|ngrok-free\.dev))$",
)

app = FastAPI()
app.include_router(chat_router)
app.include_router(iot_router)
app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")
if WEB_DIST_ASSETS_DIR.exists():
    app.mount("/web-assets", StaticFiles(directory=str(WEB_DIST_ASSETS_DIR)), name="web-assets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[*default_cors_origins, *extra_cors_origins],
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def support_api_prefixed_routes(request: Request, call_next):
    path = request.scope.get("path", "")
    if path == "/api":
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[4:] or "/"
    return await call_next(request)

# Database setup
models.Base.metadata.create_all(bind=database.engine)

def ensure_size_columns():
    inspector = inspect(database.engine)
    with database.engine.begin() as connection:
        cart_columns = {column["name"] for column in inspector.get_columns("cart_items")}
        if "size" not in cart_columns:
            connection.execute(text("ALTER TABLE cart_items ADD COLUMN size VARCHAR(50) NULL"))
        if "color" not in cart_columns:
            connection.execute(text("ALTER TABLE cart_items ADD COLUMN color VARCHAR(50) NULL"))

        product_columns = {column["name"] for column in inspector.get_columns("products")}
        if "variant_stock_json" not in product_columns:
            connection.execute(text("ALTER TABLE products ADD COLUMN variant_stock_json TEXT NULL"))
            connection.execute(text("UPDATE products SET variant_stock_json = '[]' WHERE variant_stock_json IS NULL"))

        order_columns = {column["name"] for column in inspector.get_columns("order_items")}
        if "size" not in order_columns:
            connection.execute(text("ALTER TABLE order_items ADD COLUMN size VARCHAR(50) NULL"))
        if "color" not in order_columns:
            connection.execute(text("ALTER TABLE order_items ADD COLUMN color VARCHAR(50) NULL"))

        orders_columns = {column["name"] for column in inspector.get_columns("orders")}
        if "shipping_first_name" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_first_name VARCHAR(50) NULL"))
        if "shipping_last_name" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_last_name VARCHAR(50) NULL"))
        if "shipping_email" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_email VARCHAR(100) NULL"))
        if "shipping_phone" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_phone VARCHAR(50) NULL"))
        if "shipping_address" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_address VARCHAR(255) NULL"))
        if "shipping_city" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_city VARCHAR(100) NULL"))
        if "shipping_province" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_province VARCHAR(100) NULL"))
        if "shipping_postal_code" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_postal_code VARCHAR(20) NULL"))
        if "shipping_service" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_service VARCHAR(50) NULL"))
        if "shipping_fee" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN shipping_fee FLOAT DEFAULT 0"))
        if "delivery_notes" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN delivery_notes TEXT NULL"))
        if "payment_method" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) NULL"))
        if "payment_last4" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN payment_last4 VARCHAR(4) NULL"))
        if "cod_amount" not in orders_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN cod_amount FLOAT NULL"))

        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "profile_json" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN profile_json TEXT NULL"))
        if "address_json" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN address_json TEXT NULL"))
        if "measurements_json" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN measurements_json TEXT NULL"))
        if "preferences_json" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN preferences_json TEXT NULL"))
        if "membership_active" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN membership_active BOOLEAN DEFAULT FALSE"))
        if "membership_rfid_uid" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN membership_rfid_uid VARCHAR(64) NULL"))
        if "membership_joined_at" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN membership_joined_at DATETIME NULL"))
        if "updated_at" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN updated_at DATETIME NULL"))

        connection.execute(text("UPDATE users SET updated_at = created_at WHERE updated_at IS NULL"))

ensure_size_columns()

with database.SessionLocal() as seed_db:
    product_catalog.seed_products(seed_db)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str


class AdminLoginPayload(BaseModel):
    email: str
    password: str


class AdminAccessAccountPayload(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Customer Service"
    active: bool = True


class AdminAccessAccountUpdatePayload(BaseModel):
    name: str
    email: str
    password: str | None = None
    role: str = "Customer Service"
    active: bool = True


class VariantStockPayload(BaseModel):
    size: str | None = None
    color: str | None = None
    stock: int = 0


class ProductPayload(BaseModel):
    sku: str
    name: str
    category: str
    description: str
    price: float
    stock: int
    images: list[str]
    sizes: list[str]
    colors: list[str]
    variantStocks: list[VariantStockPayload] = []
    isFeatured: bool = False
    isNew: bool = False
    rating: float = 0
    reviews: int = 0


class ProductUpdatePayload(ProductPayload):
    id: str | None = None


class OrderStatusUpdate(BaseModel):
    status: str


class NotificationReadPayload(BaseModel):
    ids: list[int] = Field(default_factory=list)
    markAll: bool = False


class ProductReviewCreatePayload(BaseModel):
    order_item_id: int
    rating: int
    comment: str | None = None


class AccountProfilePayload(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None
    phone: str | None = None
    birthday: str | None = None
    gender: str | None = None


class AccountAddressPayload(BaseModel):
    label: str | None = None
    recipient: str | None = None
    phone: str | None = None
    street: str | None = None
    city: str | None = None
    province: str | None = None
    postalCode: str | None = None
    notes: str | None = None


class AccountMeasurementsPayload(BaseModel):
    height_cm: float | None = None
    weight_kg: float | None = None
    chest_cm: float | None = None
    waist_cm: float | None = None
    hip_cm: float | None = None
    preferences: str | None = None


class AccountPreferencesPayload(BaseModel):
    preferredContact: str | None = None
    styleProfile: str | None = None
    fitPreference: str | None = None
    notifyRestock: bool | None = None
    notifyDrops: bool | None = None
    prioritySupport: bool | None = None


class AccountUpdatePayload(BaseModel):
    profile: AccountProfilePayload | None = None
    address: AccountAddressPayload | None = None
    measurements: AccountMeasurementsPayload | None = None
    preferences: AccountPreferencesPayload | None = None


class AdminCustomerMembershipPayload(BaseModel):
    active: bool
    rfidUid: str | None = None

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user(db: Session, username: str):
    return db.query(models.User).filter(
        or_(models.User.username == username, models.User.email == username)
    ).first()


def normalize_email(email: str):
    return str(email or "").strip().lower()


def safe_json_loads(value, default):
    if not value:
        return default
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return default
    return parsed if isinstance(parsed, type(default)) else default


def build_default_account_payload(user: models.User | None = None):
    return {
        "profile": {
            "firstName": "",
            "lastName": "",
            "email": user.email if user else "",
            "phone": "",
            "birthday": "",
            "gender": "Prefer not to say",
        },
        "address": {
            "label": "Primary Address",
            "recipient": "",
            "phone": "",
            "street": "",
            "city": "",
            "province": "",
            "postalCode": "",
            "notes": "",
        },
        "measurements": {
            "height_cm": None,
            "weight_kg": None,
            "chest_cm": None,
            "waist_cm": None,
            "hip_cm": None,
            "preferences": None,
        },
        "preferences": {
            "preferredContact": "email",
            "styleProfile": "Modern Elegance",
            "fitPreference": "regular",
            "notifyRestock": True,
            "notifyDrops": True,
            "prioritySupport": False,
        },
    }


def format_status_label(value: str | None):
    normalized = str(value or "").strip().lower()
    return normalized.replace("-", " ").title() if normalized else "Pending"


def merge_nested_dict(base: dict, updates: dict | None):
    merged = dict(base or {})
    for key, value in (updates or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = merge_nested_dict(merged.get(key, {}), value)
        elif value is not None:
            merged[key] = value
    return merged


def get_user_total_spend(user: models.User):
    return float(sum(float(order.total_amount or 0) for order in list(user.orders)))


def get_membership_tier(total_spend: float):
    if total_spend >= 7000:
        return "Noir"
    if total_spend >= 3000:
        return "Gold"
    if total_spend >= 1000:
        return "Silver"
    return "Bronze"


def normalize_membership_uid(value: str | None):
    cleaned = re.sub(r"[^A-Za-z0-9-]+", "", str(value or "").strip().upper())
    return cleaned[:32] or None


def serialize_user_account(user: models.User):
    defaults = build_default_account_payload(user)
    profile = merge_nested_dict(defaults["profile"], safe_json_loads(user.profile_json, {}))
    profile["email"] = user.email or profile.get("email") or ""
    address = merge_nested_dict(defaults["address"], safe_json_loads(user.address_json, {}))
    measurements = merge_nested_dict(defaults["measurements"], safe_json_loads(user.measurements_json, {}))
    preferences = merge_nested_dict(defaults["preferences"], safe_json_loads(user.preferences_json, {}))
    total_spend = get_user_total_spend(user)

    return {
        "profile": profile,
        "address": address,
        "measurements": measurements,
        "preferences": preferences,
        "membership": {
            "active": bool(user.membership_active),
            "tier": get_membership_tier(total_spend),
            "rfidUid": user.membership_rfid_uid,
            "joinedAt": user.membership_joined_at.isoformat() if user.membership_joined_at else None,
            "privateCode": user.membership_rfid_uid or f"SER-{str(user.username or '').upper()}",
        },
    }


def update_user_account(user: models.User, payload: AccountUpdatePayload):
    account = serialize_user_account(user)
    changes = payload.model_dump(exclude_none=True)

    if "profile" in changes:
        account["profile"] = merge_nested_dict(account["profile"], changes["profile"])
        next_email = normalize_email(account["profile"].get("email"))
        if next_email:
            user.email = next_email
            account["profile"]["email"] = next_email
        user.profile_json = json.dumps(account["profile"])

    if "address" in changes:
        account["address"] = merge_nested_dict(account["address"], changes["address"])
        user.address_json = json.dumps(account["address"])

    if "measurements" in changes:
        account["measurements"] = merge_nested_dict(account["measurements"], changes["measurements"])
        user.measurements_json = json.dumps(account["measurements"])

    if "preferences" in changes:
        account["preferences"] = merge_nested_dict(account["preferences"], changes["preferences"])
        user.preferences_json = json.dumps(account["preferences"])

    if not user.profile_json:
        user.profile_json = json.dumps(account["profile"])
    if not user.address_json:
        user.address_json = json.dumps(account["address"])
    if not user.measurements_json:
        user.measurements_json = json.dumps(account["measurements"])
    if not user.preferences_json:
        user.preferences_json = json.dumps(account["preferences"])


def serialize_admin_access_account(account: models.AdminAccessAccount):
    return {
        "id": str(account.id),
        "name": account.name,
        "email": account.email,
        "role": account.role,
        "active": account.is_active,
        "createdAt": account.created_at.isoformat() if account.created_at else None,
        "updatedAt": account.updated_at.isoformat() if account.updated_at else None,
        "source": "database",
    }


def serialize_demo_admin_account():
    return {
        "id": DEMO_ADMIN_ACCOUNT["id"],
        "name": DEMO_ADMIN_ACCOUNT["name"],
        "email": DEMO_ADMIN_ACCOUNT["email"],
        "role": DEMO_ADMIN_ACCOUNT["role"],
        "active": DEMO_ADMIN_ACCOUNT["active"],
        "createdAt": None,
        "updatedAt": None,
        "source": DEMO_ADMIN_ACCOUNT["source"],
        "isFixed": True,
        "passwordHint": DEMO_ADMIN_ACCOUNT["password"],
    }


def get_admin_access_account_by_email(db: Session, email: str):
    normalized_email = normalize_email(email)
    return db.query(models.AdminAccessAccount).filter(models.AdminAccessAccount.email == normalized_email).first()


def get_admin_access_account_by_id(db: Session, account_id: str):
    if not str(account_id).isdigit():
        return None
    return db.query(models.AdminAccessAccount).filter(models.AdminAccessAccount.id == int(account_id)).first()


def authenticate_admin_access_account(db: Session, email: str, password: str):
    normalized_email = normalize_email(email)
    plain_password = str(password or "")

    if normalized_email == DEMO_ADMIN_ACCOUNT["email"] and plain_password == DEMO_ADMIN_ACCOUNT["password"]:
        return serialize_demo_admin_account()

    account = get_admin_access_account_by_email(db, normalized_email)
    if not account or not account.is_active:
        return None
    if not verify_password(plain_password, account.hashed_password):
        return None
    return serialize_admin_access_account(account)

def authenticate_user(db: Session, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def get_completed_product_sales_map(db: Session):
    rows = (
        db.query(
            models.OrderItem.product_id,
            func.coalesce(func.sum(models.OrderItem.quantity), 0).label("sold_count"),
        )
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(func.lower(models.Order.status) == "completed")
        .group_by(models.OrderItem.product_id)
        .all()
    )
    return {str(row.product_id): int(row.sold_count or 0) for row in rows}


def get_product_review_entries_map(db: Session, product_ids: list[str] | None = None):
    query = db.query(models.ProductReview).order_by(desc(models.ProductReview.created_at))
    normalized_ids = [str(product_id) for product_id in (product_ids or []) if product_id is not None]
    if normalized_ids:
        query = query.filter(models.ProductReview.product_id.in_(normalized_ids))

    reviews = query.all()
    user_ids = sorted({review.user_id for review in reviews})
    usernames = {}
    if user_ids:
        users = db.query(models.User).filter(models.User.id.in_(user_ids)).all()
        usernames = {user.id: user.username for user in users}

    review_entries = {}
    for review in reviews:
        product_key = str(review.product_id)
        review_entries.setdefault(product_key, [])
        if len(review_entries[product_key]) >= 6:
            continue
        review_entries[product_key].append({
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at.isoformat() if review.created_at else None,
            "username": usernames.get(review.user_id, "Verified Buyer"),
            "verifiedPurchase": True,
        })

    return review_entries


def build_product_response(
    db: Session,
    product: models.Product,
    sales_map: dict[str, int] | None = None,
    review_entries_map: dict[str, list[dict]] | None = None,
):
    sold_count = (sales_map or {}).get(str(product.id), 0)
    review_entries = (review_entries_map or {}).get(str(product.id), [])
    return product_catalog.serialize_product(product, sold_count=sold_count, review_entries=review_entries)


def build_product_list_response(db: Session):
    sales_map = get_completed_product_sales_map(db)
    products = product_catalog.list_products(db)
    review_entries_map = get_product_review_entries_map(db, [product.id for product in products])
    return [build_product_response(db, product, sales_map, review_entries_map) for product in products]


def serialize_review(review: models.ProductReview | None):
    if not review:
        return None
    return {
        "id": review.id,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }


def serialize_notification(notification: models.Notification):
    return {
        "id": notification.id,
        "audience": notification.audience,
        "userId": notification.user_id,
        "orderId": notification.order_id,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "link": notification.link,
        "isRead": bool(notification.is_read),
        "createdAt": notification.created_at.isoformat() if notification.created_at else None,
        "readAt": notification.read_at.isoformat() if notification.read_at else None,
    }


def create_notification(
    db: Session,
    *,
    audience: str,
    type: str,
    title: str,
    message: str,
    user_id: int | None = None,
    order_id: int | None = None,
    link: str | None = None,
):
    notification = models.Notification(
        audience=audience,
        user_id=user_id,
        order_id=order_id,
        type=type,
        title=title,
        message=message,
        link=link,
        is_read=False,
    )
    db.add(notification)
    return notification


def build_notification_response(query):
    items = query.order_by(desc(models.Notification.created_at)).limit(12).all()
    unread_count = query.filter(models.Notification.is_read.is_(False)).count()
    return {
        "items": [serialize_notification(item) for item in items],
        "unreadCount": unread_count,
    }


def mark_notifications_read(query, payload: NotificationReadPayload, db: Session):
    pending_query = query.filter(models.Notification.is_read.is_(False))
    if not payload.markAll and payload.ids:
        pending_query = pending_query.filter(models.Notification.id.in_(payload.ids))

    notifications = pending_query.all()
    if not notifications:
        return 0

    now = datetime.utcnow()
    for notification in notifications:
        notification.is_read = True
        notification.read_at = now

    db.commit()
    return len(notifications)


def refresh_product_rating(db: Session, product_id: str):
    aggregate = (
        db.query(
            func.count(models.ProductReview.id).label("review_count"),
            func.avg(models.ProductReview.rating).label("avg_rating"),
        )
        .filter(models.ProductReview.product_id == str(product_id))
        .first()
    )
    product = product_catalog.get_product(db, product_id)
    if not product:
        return
    product.reviews = int((aggregate.review_count if aggregate else 0) or 0)
    product.rating = round(float((aggregate.avg_rating if aggregate else 0) or 0), 2)


def serialize_order(order: models.Order, review_map: dict[int, models.ProductReview] | None = None):
    customer_name = " ".join(
        part for part in [order.shipping_first_name, order.shipping_last_name] if part
    ).strip() or (order.user.username if order.user else "Unknown Customer")

    items = [
        {
            "id": item.id,
            "order_item_id": item.id,
            "product_id": item.product_id,
            "size": item.size,
            "color": item.color,
            "quantity": item.quantity,
            "price": item.price,
            "review": serialize_review((review_map or {}).get(item.id) if review_map is not None else getattr(item, "review", None)),
            "reviewEligible": str(order.status or "").lower() == "completed",
        }
        for item in order.items
    ]

    return {
        "id": order.id,
        "customerId": order.user_id,
        "customerName": customer_name,
        "status": order.status,
        "statusLabel": format_status_label(order.status),
        "total": order.total_amount,
        "total_amount": order.total_amount,
        "shipping_first_name": order.shipping_first_name,
        "shipping_last_name": order.shipping_last_name,
        "shipping_email": order.shipping_email,
        "shipping_phone": order.shipping_phone,
        "shipping_address": order.shipping_address,
        "shipping_city": order.shipping_city,
        "shipping_province": order.shipping_province,
        "shipping_postal_code": order.shipping_postal_code,
        "shipping_service": order.shipping_service,
        "shipping_service_label": SHIPPING_SERVICE_LABELS.get(order.shipping_service or "", order.shipping_service),
        "shipping_fee": float(order.shipping_fee or 0),
        "delivery_notes": order.delivery_notes,
        "payment_method": order.payment_method,
        "payment_method_label": PAYMENT_METHOD_LABELS.get(order.payment_method or "", order.payment_method),
        "payment_last4": order.payment_last4,
        "cod_amount": float(order.cod_amount) if order.cod_amount is not None else None,
        "order_date": order.order_date.isoformat(),
        "date": order.order_date.isoformat(),
        "address": ", ".join(part for part in [order.shipping_address, order.shipping_city, order.shipping_province, order.shipping_postal_code] if part),
        "items": items,
    }


def serialize_customer(user: models.User):
    orders = list(user.orders)
    total_spend = get_user_total_spend(user)
    total_orders = len(orders)
    last_order = max((order.order_date for order in orders), default=user.created_at)
    account = serialize_user_account(user)
    latest_shipping = account["address"].get("street") or next((order.shipping_address for order in sorted(orders, key=lambda item: item.order_date, reverse=True) if order.shipping_address), None)
    city = account["address"].get("city") or None
    if not city and latest_shipping:
        parts = [part.strip() for part in latest_shipping.split(',') if part.strip()]
        if len(parts) >= 2:
            city = parts[-2]
        elif parts:
            city = parts[-1]

    return {
        "id": f"U{user.id}",
        "userId": user.id,
        "name": " ".join([account["profile"].get("firstName") or "", account["profile"].get("lastName") or ""]).strip() or user.username,
        "username": user.username,
        "email": user.email,
        "phone": account["profile"].get("phone") or account["address"].get("phone") or "-",
        "totalOrders": total_orders,
        "totalSpend": total_spend,
        "lastActive": last_order.isoformat() if last_order else None,
        "tier": get_membership_tier(total_spend),
        "city": city or "-",
        "membershipActive": bool(user.membership_active),
        "membershipRfidUid": user.membership_rfid_uid,
        "membershipJoinedAt": user.membership_joined_at.isoformat() if user.membership_joined_at else None,
        "profile": account["profile"],
        "address": account["address"],
        "measurements": account["measurements"],
        "preferences": account["preferences"],
    }


def apply_product_payload(product: models.Product, payload: ProductUpdatePayload):
    variant_stocks = product_catalog.build_variant_stocks(
        payload.sizes,
        payload.colors,
        payload.stock,
        [variant.model_dump() for variant in payload.variantStocks],
    )
    product.sku = payload.sku
    product.name = payload.name
    product.category = payload.category
    product.description = payload.description
    product.price = payload.price
    product.stock = product_catalog.get_total_stock_from_variants(variant_stocks)
    product.images_json = json.dumps(payload.images)
    product.sizes_json = json.dumps(payload.sizes)
    product.colors_json = json.dumps(payload.colors)
    product.variant_stock_json = json.dumps(variant_stocks)
    product.is_featured = payload.isFeatured
    product.is_new = payload.isNew
    product.rating = payload.rating
    product.reviews = payload.reviews


def sanitize_filename(filename: str):
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", Path(filename).stem).strip("-") or "product"
    extension = Path(filename).suffix.lower()
    return stem, extension


def should_serve_storefront(path: str):
    protected_prefixes = (
        "auth",
        "admin",
        ADMIN_PUBLIC_PATH,
        "products",
        "cart",
        "wishlist",
        "orders",
        "assets",
        "web-assets",
        "docs",
        "redoc",
        "openapi.json",
    )
    return not any(path == prefix or path.startswith(f"{prefix}/") for prefix in protected_prefixes)

# Shared schemas/dependencies/helpers remain in this file.


# --- Helper: Get Current User from Token ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = get_user(db, username)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/me/account")
def get_my_account(current_user: models.User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        **serialize_user_account(current_user),
    }


@app.put("/me/account")
def update_my_account(payload: AccountUpdatePayload, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    next_email = normalize_email(payload.profile.email) if payload.profile and payload.profile.email is not None else None
    if next_email:
        existing = db.query(models.User).filter(models.User.email == next_email, models.User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account")

    update_user_account(current_user, payload)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "message": "Account updated successfully",
        "account": {
            "username": current_user.username,
            "email": current_user.email,
            **serialize_user_account(current_user),
        },
    }


# --- Pydantic Schemas ---
class CartItemAdd(BaseModel):
    product_id: str
    size: str
    color: str | None = None
    quantity: int = 1

class CartItemResponse(BaseModel):
    id: int
    product_id: str
    size: str | None = None
    color: str | None = None
    quantity: int
    
    class Config:
        from_attributes = True

class WishlistItemAdd(BaseModel):
    product_id: str

class WishlistItemResponse(BaseModel):
    id: int
    product_id: str
    
    class Config:
        from_attributes = True

class OrderItemRequest(BaseModel):
    product_id: str
    size: str
    color: str | None = None
    quantity: int

class OrderCheckout(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    address: str
    city: str
    province: str
    postal_code: str
    shipping_service: str
    delivery_notes: str | None = None
    payment_method: str
    payment_last4: str
    cod_amount: float | None = None
    items: list[OrderItemRequest]
    total_amount: float | None = None


class StockAdjustment(BaseModel):
    product_id: str
    size: str | None = None
    color: str | None = None
    requested_quantity: int
    applied_quantity: int
    available_quantity: int

class OrderResponse(BaseModel):
    id: int
    status: str
    total_amount: float
    
    class Config:
        from_attributes = True


def clamp_quantity_to_stock(product: models.Product, size: str | None, color: str | None, requested_quantity: int):
    available_quantity = product_catalog.get_variant_stock(product, size, color)
    requested_quantity = max(int(requested_quantity or 0), 0)
    applied_quantity = min(requested_quantity, max(available_quantity, 0))
    adjustment = None

    if applied_quantity != requested_quantity:
        adjustment = StockAdjustment(
            product_id=str(product.id),
            size=size,
            color=color,
            requested_quantity=requested_quantity,
            applied_quantity=applied_quantity,
            available_quantity=max(available_quantity, 0),
        )

    return applied_quantity, max(available_quantity, 0), adjustment


from routers.public_routes import router as public_router
from routers.auth_routes import router as auth_router
from routers.account_routes import router as account_router
from routers.cart_routes import router as cart_router
from routers.wishlist_routes import router as wishlist_router
from routers.order_routes import router as order_router
from routers.admin_routes import router as admin_router

app.include_router(auth_router)
app.include_router(account_router)
app.include_router(cart_router)
app.include_router(wishlist_router)
app.include_router(order_router)
app.include_router(admin_router)
app.include_router(public_router)
