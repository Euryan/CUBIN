import shutil
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import desc
from sqlalchemy.orm import Session

import database
import models
import product_catalog
from app import (
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_ORDER_STATUSES,
    IMAGE_UPLOAD_DIR,
    NotificationReadPayload,
    OrderStatusUpdate,
    ProductPayload,
    ProductUpdatePayload,
    SHIPPING_SERVICE_LABELS,
    AdminCustomerMembershipPayload,
    apply_product_payload,
    build_notification_response,
    build_product_list_response,
    build_product_response,
    create_notification,
    format_status_label,
    get_completed_product_sales_map,
    get_product_review_entries_map,
    mark_notifications_read,
    normalize_membership_uid,
    serialize_customer,
    serialize_order,
    sanitize_filename,
)

router = APIRouter()


@router.get('/admin/products')
def admin_get_products(db: Session = Depends(database.get_db)):
    return build_product_list_response(db)


@router.post('/admin/uploads/images')
async def admin_upload_product_image(request: Request, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail='No image file provided')

    stem, extension = sanitize_filename(file.filename)
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail='Unsupported image format. Use JPG, PNG, WEBP, or GIF.')

    filename = f'{stem}-{uuid4().hex[:10]}{extension}'
    destination = IMAGE_UPLOAD_DIR / filename

    with destination.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)

    public_url = f"{str(request.base_url).rstrip('/')}/assets/img/{filename}"
    return {
        'filename': filename,
        'path': f'/assets/img/{filename}',
        'url': public_url,
    }


@router.post('/admin/products')
def admin_create_product(payload: ProductPayload, db: Session = Depends(database.get_db)):
    existing_ids = [int(product.id) for product in product_catalog.list_products(db) if str(product.id).isdigit()]
    next_id = str(max(existing_ids, default=0) + 1)
    product = models.Product(id=next_id)
    apply_product_payload(product, ProductUpdatePayload(id=next_id, **payload.model_dump()))
    db.add(product)
    db.commit()
    db.refresh(product)
    sales_map = get_completed_product_sales_map(db)
    review_entries_map = get_product_review_entries_map(db, [product.id])
    return build_product_response(db, product, sales_map, review_entries_map)


@router.put('/admin/products/{product_id}')
def admin_update_product(product_id: str, payload: ProductUpdatePayload, db: Session = Depends(database.get_db)):
    product = product_catalog.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')

    apply_product_payload(product, payload)
    db.commit()
    db.refresh(product)
    sales_map = get_completed_product_sales_map(db)
    review_entries_map = get_product_review_entries_map(db, [product.id])
    return build_product_response(db, product, sales_map, review_entries_map)


@router.delete('/admin/products/{product_id}')
def admin_delete_product(product_id: str, db: Session = Depends(database.get_db)):
    product = product_catalog.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')

    db.delete(product)
    db.commit()
    return {'message': 'Product deleted'}


@router.get('/admin/orders')
def admin_get_orders(db: Session = Depends(database.get_db)):
    orders = db.query(models.Order).order_by(desc(models.Order.order_date)).all()
    order_ids = [order.id for order in orders]
    review_map = {}
    if order_ids:
        reviews = db.query(models.ProductReview).filter(models.ProductReview.order_id.in_(order_ids)).all()
        review_map = {review.order_item_id: review for review in reviews}
    return [serialize_order(order, review_map) for order in orders]


@router.get('/admin/notifications')
def admin_get_notifications(db: Session = Depends(database.get_db)):
    query = db.query(models.Notification).filter(models.Notification.audience == 'admin')
    return build_notification_response(query)


@router.patch('/admin/notifications/read')
def admin_mark_notifications_read(payload: NotificationReadPayload, db: Session = Depends(database.get_db)):
    query = db.query(models.Notification).filter(models.Notification.audience == 'admin')
    updated = mark_notifications_read(query, payload, db)
    return {'updated': updated, 'message': 'Notifications updated'}


@router.patch('/admin/orders/{order_id}')
def admin_update_order_status(order_id: int, payload: OrderStatusUpdate, db: Session = Depends(database.get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')

    next_status = str(payload.status or '').strip().lower()
    if next_status not in ALLOWED_ORDER_STATUSES:
        raise HTTPException(status_code=400, detail='Invalid order status')

    previous_status = str(order.status or '').strip().lower()
    order.status = next_status
    if next_status != previous_status:
        customer_name = ' '.join(
            part for part in [order.shipping_first_name, order.shipping_last_name] if part
        ).strip() or (order.user.username if order.user else 'Customer')
        create_notification(
            db,
            audience='user',
            user_id=order.user_id,
            order_id=order.id,
            type='order-status-updated',
            title=f'Order #{order.id} updated',
            message=f'Hi {customer_name}, your order status changed from {format_status_label(previous_status)} to {format_status_label(next_status)}.',
            link='orders',
        )

    db.commit()
    db.refresh(order)
    review_map = {
        review.order_item_id: review
        for review in db.query(models.ProductReview).filter(models.ProductReview.order_id == order.id).all()
    }
    return serialize_order(order, review_map)


@router.get('/admin/customers')
def admin_get_customers(db: Session = Depends(database.get_db)):
    users = db.query(models.User).order_by(desc(models.User.created_at)).all()
    return [serialize_customer(user) for user in users]


@router.put('/admin/customers/{user_id}/membership')
def admin_update_customer_membership(user_id: int, payload: AdminCustomerMembershipPayload, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Customer not found')

    normalized_uid = normalize_membership_uid(payload.rfidUid)
    if payload.active and not normalized_uid:
        raise HTTPException(status_code=400, detail='RFID UID wajib diisi untuk membership aktif')

    if normalized_uid:
        existing_user = db.query(models.User).filter(models.User.membership_rfid_uid == normalized_uid, models.User.id != user.id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail='RFID UID sudah dipakai customer lain')

    user.membership_active = payload.active
    user.membership_rfid_uid = normalized_uid if payload.active else None
    if payload.active and not user.membership_joined_at:
        user.membership_joined_at = datetime.utcnow()
    if not payload.active:
        user.membership_joined_at = None

    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        'message': 'Customer membership updated',
        'customer': serialize_customer(user),
    }
