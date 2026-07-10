from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import database
import models
from app import CartItemAdd, get_current_user
from services import cart_service

router = APIRouter()


@router.post('/cart/add')
def add_to_cart(item: CartItemAdd, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return cart_service.add_to_cart(item, current_user, db)


@router.get('/cart')
def get_cart(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return cart_service.get_cart(current_user, db)


@router.delete('/cart/{item_id}')
def remove_from_cart(item_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return cart_service.remove_from_cart(item_id, current_user, db)


@router.post('/cart/clear')
def clear_cart(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return cart_service.clear_cart(current_user, db)
