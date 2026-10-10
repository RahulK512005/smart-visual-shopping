from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from backend.app.db.repositories.product_repo import ProductRepository
from backend.app.schemas.product import ProductRead, ProductListResponse
from backend.app.core.errors import ProductNotFoundError
from backend.app.db.models import Product


class ProductService:
    def __init__(self, db: Session):
        self.repo = ProductRepository(db)

    def get_product(self, product_id: str) -> ProductRead:
        product = self.repo.get_by_id(product_id)
        if not product:
            raise ProductNotFoundError(product_id)
        return ProductRead.model_validate(product)

    def get_product_entity(self, product_id: str) -> Product:
        product = self.repo.get_by_id(product_id)
        if not product:
            raise ProductNotFoundError(product_id)
        return product

    def list_products(
        self,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        query: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> ProductListResponse:
        page = max(1, page)
        page_size = max(1, min(100, page_size))
        skip = (page - 1) * page_size

        items, total = self.repo.list_products(
            category=category,
            brand=brand,
            query=query,
            min_price=min_price,
            max_price=max_price,
            skip=skip,
            limit=page_size,
        )

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return ProductListResponse(
            items=[ProductRead.model_validate(p) for p in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
