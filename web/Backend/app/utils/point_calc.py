from app.models.category import Category


def calculate_point(weight: float, category: Category) -> float:
    return round(weight * category.price, 2)


def build_trash_record(user_id: int, category: Category, weight: float, confidence_ai: float) -> dict:
    point = calculate_point(weight, category)
    return {
        "user_id": user_id,
        "category": category.name,
        "weight": weight,
        "point": point,
        "price": category.price,
        "confidence_ai": confidence_ai,
    }
