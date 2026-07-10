from fastapi import HTTPException

import models


def add_to_wishlist(item, current_user, db):
    existing = db.query(models.WishlistItem).filter(
        models.WishlistItem.user_id == current_user.id,
        models.WishlistItem.product_id == item.product_id,
    ).first()

    if existing:
        return {"message": "Item already in wishlist"}

    wishlist_item = models.WishlistItem(
        user_id=current_user.id,
        product_id=item.product_id,
    )
    db.add(wishlist_item)
    db.commit()
    return {"message": "Item added to wishlist"}


def get_wishlist(current_user, db):
    items = db.query(models.WishlistItem).filter(models.WishlistItem.user_id == current_user.id).all()
    return [{"id": item.id, "product_id": item.product_id} for item in items]


def remove_from_wishlist(item_id, current_user, db):
    item = db.query(models.WishlistItem).filter(
        models.WishlistItem.id == item_id,
        models.WishlistItem.user_id == current_user.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return {"message": "Item removed from wishlist"}
