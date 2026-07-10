from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import desc
from sqlalchemy.orm import Session

import database
import models
from app import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    DEMO_ADMIN_ACCOUNT,
    AdminAccessAccountPayload,
    AdminAccessAccountUpdatePayload,
    AdminLoginPayload,
    Token,
    UserCreate,
    authenticate_admin_access_account,
    authenticate_user,
    create_access_token,
    get_admin_access_account_by_email,
    get_admin_access_account_by_id,
    get_password_hash,
    get_user,
    normalize_email,
    serialize_admin_access_account,
    serialize_demo_admin_account,
)
from services import auth_service

router = APIRouter()


@router.post('/auth/register', response_model=Token)
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    return auth_service.register_user(
        user,
        db,
        get_user=get_user,
        get_password_hash=get_password_hash,
        create_access_token=create_access_token,
    )


@router.post('/auth/login', response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    return auth_service.login_user(
        form_data,
        db,
        authenticate_user=authenticate_user,
        create_access_token=create_access_token,
        access_token_expire_minutes=ACCESS_TOKEN_EXPIRE_MINUTES,
    )


@router.post('/admin/auth/login')
def admin_login(payload: AdminLoginPayload, db: Session = Depends(database.get_db)):
    account = authenticate_admin_access_account(db, payload.email, payload.password)
    if not account:
        raise HTTPException(status_code=401, detail='Invalid admin credentials')
    return account


@router.get('/admin/access-accounts')
def admin_get_access_accounts(db: Session = Depends(database.get_db)):
    accounts = db.query(models.AdminAccessAccount).order_by(desc(models.AdminAccessAccount.created_at)).all()
    return [serialize_demo_admin_account(), *[serialize_admin_access_account(account) for account in accounts]]


@router.post('/admin/access-accounts')
def admin_create_access_account(payload: AdminAccessAccountPayload, db: Session = Depends(database.get_db)):
    normalized_email = normalize_email(payload.email)
    normalized_name = payload.name.strip()
    if not normalized_email:
        raise HTTPException(status_code=400, detail='Email wajib diisi')
    if not normalized_name:
        raise HTTPException(status_code=400, detail='Nama akun wajib diisi')
    if normalized_email == DEMO_ADMIN_ACCOUNT['email']:
        raise HTTPException(status_code=400, detail='Email demo bawaan sudah dipakai sistem')
    if get_admin_access_account_by_email(db, normalized_email):
        raise HTTPException(status_code=400, detail='Email akun sudah terdaftar')
    if len(payload.password or '') < 4:
        raise HTTPException(status_code=400, detail='Password minimal 4 karakter')

    account = models.AdminAccessAccount(
        name=normalized_name,
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role.strip() or 'Customer Service',
        is_active=payload.active,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return serialize_admin_access_account(account)


@router.put('/admin/access-accounts/{account_id}')
def admin_update_access_account(account_id: str, payload: AdminAccessAccountUpdatePayload, db: Session = Depends(database.get_db)):
    account = get_admin_access_account_by_id(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail='Akun tidak ditemukan')

    normalized_email = normalize_email(payload.email)
    normalized_name = payload.name.strip()
    if not normalized_email:
        raise HTTPException(status_code=400, detail='Email wajib diisi')
    if not normalized_name:
        raise HTTPException(status_code=400, detail='Nama akun wajib diisi')
    if normalized_email == DEMO_ADMIN_ACCOUNT['email']:
        raise HTTPException(status_code=400, detail='Email demo bawaan tidak bisa dipakai ulang')

    existing_account = get_admin_access_account_by_email(db, normalized_email)
    if existing_account and existing_account.id != account.id:
        raise HTTPException(status_code=400, detail='Email akun sudah terdaftar')

    account.name = normalized_name
    account.email = normalized_email
    account.role = payload.role.strip() or 'Customer Service'
    account.is_active = payload.active

    next_password = str(payload.password or '').strip()
    if next_password:
        if len(next_password) < 4:
            raise HTTPException(status_code=400, detail='Password minimal 4 karakter')
        account.hashed_password = get_password_hash(next_password)

    db.commit()
    db.refresh(account)
    return serialize_admin_access_account(account)


@router.delete('/admin/access-accounts/{account_id}')
def admin_delete_access_account(account_id: str, db: Session = Depends(database.get_db)):
    account = get_admin_access_account_by_id(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail='Akun tidak ditemukan')
    db.delete(account)
    db.commit()
    return {'message': 'Access account deleted'}
