from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import models
from app import (
    AccountUpdatePayload,
    NotificationReadPayload,
    build_notification_response,
    get_current_user,
    mark_notifications_read,
    normalize_email,
    serialize_user_account,
    update_user_account,
)

router = APIRouter()


@router.get('/me/account')
def get_my_account(current_user: models.User = Depends(get_current_user)):
    return {
        'username': current_user.username,
        'email': current_user.email,
        **serialize_user_account(current_user),
    }


@router.put('/me/account')
def update_my_account(
    payload: AccountUpdatePayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db),
):
    next_email = normalize_email(payload.profile.email) if payload.profile and payload.profile.email is not None else None
    if next_email:
        existing = db.query(models.User).filter(models.User.email == next_email, models.User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail='Email already in use by another account')

    update_user_account(current_user, payload)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        'message': 'Account updated successfully',
        'account': {
            'username': current_user.username,
            'email': current_user.email,
            **serialize_user_account(current_user),
        },
    }


@router.get('/me/notifications')
def get_my_notifications(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    query = db.query(models.Notification).filter(
        models.Notification.audience == 'user',
        models.Notification.user_id == current_user.id,
    )
    return build_notification_response(query)


@router.patch('/me/notifications/read')
def mark_my_notifications_read(
    payload: NotificationReadPayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db),
):
    query = db.query(models.Notification).filter(
        models.Notification.audience == 'user',
        models.Notification.user_id == current_user.id,
    )
    updated = mark_notifications_read(query, payload, db)
    return {'updated': updated, 'message': 'Notifications updated'}
