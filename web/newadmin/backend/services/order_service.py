import re

from fastapi import HTTPException

import models
import product_catalog


def checkout(
    order_data,
    current_user,
    db,
    *,
    shipping_service_fees,
    payment_method_labels,
    clamp_quantity_to_stock,
    create_notification,
    normalize_email,
):
    computed_total = 0
    normalized_items = []
    adjustments = []

    shipping_service = str(order_data.shipping_service or "").strip().lower()
    if shipping_service not in shipping_service_fees:
        raise HTTPException(status_code=400, detail="Invalid shipping service")

    payment_method = str(order_data.payment_method or "").strip().lower()
    if payment_method not in payment_method_labels:
        raise HTTPException(status_code=400, detail="Invalid payment method")

    for item in order_data.items:
        product = product_catalog.get_product(db, item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        if not product_catalog.is_valid_size(db, item.product_id, item.size):
            raise HTTPException(status_code=400, detail=f"Invalid size for product {item.product_id}")

        if not product_catalog.is_valid_color(db, item.product_id, item.color):
            raise HTTPException(status_code=400, detail=f"Invalid color for product {item.product_id}")

        if item.quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1")

        applied_quantity, available_quantity, adjustment = clamp_quantity_to_stock(
            product,
            item.size,
            item.color,
            item.quantity,
        )

        if available_quantity <= 0 or applied_quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Stock untuk product {item.product_id} sudah habis")

        if adjustment:
            adjustments.append(adjustment.model_dump())

        unit_price = product_catalog.get_product_price(db, item.product_id)
        computed_total += applied_quantity * unit_price
        normalized_items.append(
            {
                "product": product,
                "product_id": item.product_id,
                "size": item.size,
                "color": item.color,
                "quantity": applied_quantity,
                "price": unit_price,
            }
        )

    shipping_fee = float(shipping_service_fees.get(shipping_service, 0))
    payment_last4 = re.sub(r"\D", "", str(order_data.payment_last4 or ""))[-4:] if payment_method != "cod" else None

    cod_amount = None
    if payment_method == "cod":
        cod_amount = float(order_data.cod_amount) if order_data.cod_amount is not None else None

    order = models.Order(
        user_id=current_user.id,
        shipping_first_name=order_data.first_name.strip(),
        shipping_last_name=order_data.last_name.strip(),
        shipping_email=normalize_email(order_data.email),
        shipping_phone=order_data.phone.strip(),
        shipping_address=order_data.address.strip(),
        shipping_city=order_data.city.strip(),
        shipping_province=order_data.province.strip(),
        shipping_postal_code=order_data.postal_code.strip(),
        shipping_service=shipping_service,
        shipping_fee=shipping_fee,
        delivery_notes=(order_data.delivery_notes or "").strip() or None,
        payment_method=payment_method,
        payment_last4=payment_last4,
        cod_amount=cod_amount,
        total_amount=computed_total + shipping_fee,
        status="pending",
    )
    db.add(order)
    db.flush()

    create_notification(
        db,
        audience="admin",
        type="new-order",
        title=f"New order #{order.id}",
        message=f"{current_user.username} placed a new order worth ${float(order.total_amount or 0):,.2f}.",
        order_id=order.id,
        link="orders",
    )

    for item in normalized_items:
        order_item = models.OrderItem(
            order_id=order.id,
            product_id=item["product_id"],
            size=item["size"],
            color=item["color"],
            quantity=item["quantity"],
            price=item["price"],
        )
        db.add(order_item)
        product_catalog.update_variant_stock(item["product"], item["size"], item["color"], -item["quantity"])

    db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).delete()

    db.commit()
    db.refresh(order)
    return {
        "message": "Order placed successfully",
        "order_id": order.id,
        "status": order.status,
        "shipping_fee": shipping_fee,
        "adjustments": adjustments,
    }
