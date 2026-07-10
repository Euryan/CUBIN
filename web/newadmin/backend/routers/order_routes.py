from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

import database
import models
from app import (
    PAYMENT_METHOD_LABELS,
    SHIPPING_SERVICE_FEES,
    OrderCheckout,
    ProductReviewCreatePayload,
    clamp_quantity_to_stock,
    create_notification,
    get_current_user,
    normalize_email,
    refresh_product_rating,
    serialize_order,
    serialize_review,
)
from services import order_service

router = APIRouter()


@router.post('/orders/checkout')
def checkout(order_data: OrderCheckout, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return order_service.checkout(
        order_data,
        current_user,
        db,
        shipping_service_fees=SHIPPING_SERVICE_FEES,
        payment_method_labels=PAYMENT_METHOD_LABELS,
        clamp_quantity_to_stock=clamp_quantity_to_stock,
        create_notification=create_notification,
        normalize_email=normalize_email,
    )


@router.get('/orders')
def get_orders(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).order_by(desc(models.Order.order_date)).all()
    order_ids = [order.id for order in orders]
    review_map = {}
    if order_ids:
        reviews = db.query(models.ProductReview).filter(models.ProductReview.order_id.in_(order_ids)).all()
        review_map = {review.order_item_id: review for review in reviews}
    return [serialize_order(order, review_map) for order in orders]


@router.get('/orders/{order_id}')
def get_order(order_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail='Order not found')

    review_map = {
        review.order_item_id: review
        for review in db.query(models.ProductReview).filter(models.ProductReview.order_id == order.id).all()
    }

    return serialize_order(order, review_map)


@router.post('/orders/{order_id}/reviews')
def create_product_review(
    order_id: int,
    payload: ProductReviewCreatePayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db),
):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail='Rating must be between 1 and 5')

    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')

    if str(order.status or '').lower() != 'completed':
        raise HTTPException(status_code=400, detail='Review can only be submitted after the order is completed')

    order_item = db.query(models.OrderItem).filter(
        models.OrderItem.id == payload.order_item_id,
        models.OrderItem.order_id == order.id,
    ).first()
    if not order_item:
        raise HTTPException(status_code=404, detail='Order item not found')

    existing_review = db.query(models.ProductReview).filter(models.ProductReview.order_item_id == order_item.id).first()
    if existing_review:
        raise HTTPException(status_code=400, detail='This item has already been reviewed')

    review = models.ProductReview(
        user_id=current_user.id,
        order_id=order.id,
        order_item_id=order_item.id,
        product_id=order_item.product_id,
        rating=int(payload.rating),
        comment=(payload.comment or '').strip() or None,
    )
    db.add(review)
    db.flush()
    refresh_product_rating(db, order_item.product_id)
    db.commit()
    db.refresh(review)

    return {
        'message': 'Review submitted successfully',
        'review': serialize_review(review),
        'product_id': order_item.product_id,
    }
