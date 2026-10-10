from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.product import ProductListResponse, ProductRead
from backend.app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
def list_products(
    category: Optional[str] = Query(None, description="Filter by product category (e.g. smartphone, laptop, charger)"),
    brand: Optional[str] = Query(None, description="Filter by brand (e.g. Apple, Samsung, Anker)"),
    query: Optional[str] = Query(None, alias="q", description="Full text search on name, brand, model, description"),
    min_price: Optional[float] = Query(None, ge=0.0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0.0, description="Maximum price filter"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    db: Session = Depends(get_db),
):
    """
    Retrieve paginated product catalog items with multi-attribute filtering.
    """
    service = ProductService(db)
    return service.list_products(
        category=category,
        brand=brand,
        query=query,
        min_price=min_price,
        max_price=max_price,
        page=page,
        page_size=page_size,
    )


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve single product details and structured specifications by product ID.
    """
    service = ProductService(db)
    return service.get_product(product_id)
