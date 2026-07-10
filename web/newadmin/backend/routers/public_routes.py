from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import database
import product_catalog
from app import (
    ADMIN_DIST_DIR,
    ADMIN_INDEX_FILE,
    ADMIN_PUBLIC_PATH,
    WEB_DIST_DIR,
    WEB_INDEX_FILE,
    build_product_list_response,
    build_product_response,
    get_completed_product_sales_map,
    get_product_review_entries_map,
    should_serve_storefront,
)

router = APIRouter()


@router.get('/', include_in_schema=False)
def serve_storefront_root():
    if WEB_INDEX_FILE.exists():
        return FileResponse(str(WEB_INDEX_FILE))
    raise HTTPException(status_code=404, detail='Storefront build not found')


@router.get(f'/{ADMIN_PUBLIC_PATH}', include_in_schema=False)
def serve_admin_root():
    if ADMIN_INDEX_FILE.exists():
        return FileResponse(str(ADMIN_INDEX_FILE))
    raise HTTPException(status_code=404, detail='Admin build not found')


@router.get(f'/{ADMIN_PUBLIC_PATH}/{{full_path:path}}', include_in_schema=False)
def serve_admin_app(full_path: str):
    normalized_path = (full_path or '').strip('/')
    if not normalized_path:
        return serve_admin_root()

    target_file = ADMIN_DIST_DIR / normalized_path
    if target_file.exists() and target_file.is_file():
        return FileResponse(str(target_file))

    if ADMIN_INDEX_FILE.exists():
        return FileResponse(str(ADMIN_INDEX_FILE))

    raise HTTPException(status_code=404, detail='Admin build not found')


@router.get('/products')
def get_products(db: Session = Depends(database.get_db)):
    return build_product_list_response(db)


@router.get('/products/{product_id}')
def get_product(product_id: str, db: Session = Depends(database.get_db)):
    product = product_catalog.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')
    sales_map = get_completed_product_sales_map(db)
    review_entries_map = get_product_review_entries_map(db, [product.id])
    return build_product_response(db, product, sales_map, review_entries_map)


@router.get('/{full_path:path}', include_in_schema=False)
def serve_storefront_app(full_path: str):
    normalized_path = (full_path or '').strip('/')
    if not normalized_path:
        return serve_storefront_root()

    target_file = WEB_DIST_DIR / normalized_path
    if target_file.exists() and target_file.is_file():
        return FileResponse(str(target_file))

    if not should_serve_storefront(normalized_path):
        raise HTTPException(status_code=404, detail='Not Found')

    if WEB_INDEX_FILE.exists():
        return FileResponse(str(WEB_INDEX_FILE))

    raise HTTPException(status_code=404, detail='Storefront build not found')
