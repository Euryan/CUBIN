from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import database
import models
from app import WishlistItemAdd, get_current_user
from services import wishlist_service

router = APIRouter()


@router.post('/wishlist/add')
def add_to_wishlist(item: WishlistItemAdd, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return wishlist_service.add_to_wishlist(item, current_user, db)


@router.get('/wishlist')
def get_wishlist(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return wishlist_service.get_wishlist(current_user, db)


@router.delete('/wishlist/{item_id}')
def remove_from_wishlist(item_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    return wishlist_service.remove_from_wishlist(item_id, current_user, db)
