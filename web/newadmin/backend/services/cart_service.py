from fastapi import HTTPException

import models
import product_catalog


def add_to_cart(item, current_user, db):
    product = product_catalog.get_product(db, item.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not product_catalog.is_valid_size(db, item.product_id, item.size):
        raise HTTPException(status_code=400, detail="Invalid size for selected product")

    if not product_catalog.is_valid_color(db, item.product_id, item.color):
        raise HTTPException(status_code=400, detail="Invalid color for selected product")

    existing = db.query(models.CartItem).filter(
        models.CartItem.user_id == current_user.id,
        models.CartItem.product_id == item.product_id,
        models.CartItem.size == item.size,
        models.CartItem.color == item.color,
    ).first()

    current_quantity = existing.quantity if existing else 0
    available_quantity = product_catalog.get_variant_stock(product, item.size, item.color)
    target_quantity = min(current_quantity + max(item.quantity, 0), max(available_quantity, 0))
    added_quantity = max(target_quantity - current_quantity, 0)

    if available_quantity <= 0:
        raise HTTPException(status_code=400, detail="Variant stok habis")

    if added_quantity <= 0:
        return {
            "message": f"Stok tersisa {available_quantity}. Quantity di bag tidak bertambah.",
            "adjusted": True,
            "available_quantity": available_quantity,
            "cart_quantity": current_quantity,
            "added_quantity": 0,
        }

    if existing:
        existing.quantity = target_quantity
    else:
        cart_item = models.CartItem(
            user_id=current_user.id,
            product_id=item.product_id,
            size=item.size,
            color=item.color,
            quantity=added_quantity,
        )
        db.add(cart_item)

    db.commit()
    return {
        "message": "Item added to cart",
        "adjusted": added_quantity != item.quantity,
        "available_quantity": available_quantity,
        "cart_quantity": target_quantity,
        "added_quantity": added_quantity,
    }


def get_cart(current_user, db):
    items = db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).all()
    return [
        {
            "id": item.id,
            "product_id": item.product_id,
            "size": item.size,
            "color": item.color,
            "quantity": item.quantity,
        }
        for item in items
    ]


def remove_from_cart(item_id, current_user, db):
    item = db.query(models.CartItem).filter(
        models.CartItem.id == item_id,
        models.CartItem.user_id == current_user.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return {"message": "Item removed from cart"}


def clear_cart(current_user, db):
    db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Cart cleared"}
