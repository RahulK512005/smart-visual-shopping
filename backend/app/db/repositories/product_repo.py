from typing import List, Optional, Tuple
from sqlalchemy import or_, select, func
from sqlalchemy.orm import Session
from backend.app.db.models import Product
from backend.app.schemas.product import ProductCreate, ProductUpdate


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, product_id: str) -> Optional[Product]:
        return self.db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()

    def get_by_ids(self, product_ids: List[str]) -> List[Product]:
        if not product_ids:
            return []
        return self.db.query(Product).filter(
            Product.id.in_(product_ids),
            Product.is_active == True
        ).all()

    def list_products(
        self,
        category: Optional[str] = None,
        brand: Optional[str] = None,
        query: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Product], int]:
        q = self.db.query(Product).filter(Product.is_active == True)

        if category:
            if "," in category:
                cats = [c.strip().lower() for c in category.split(",") if c.strip()]
                q = q.filter(Product.category.in_(cats))
            else:
                q = q.filter(Product.category.ilike(category.strip()))
        if brand:
            q = q.filter(Product.brand.ilike(brand.strip()))
        if query:
            search_term = f"%{query.strip()}%"
            q = q.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.brand.ilike(search_term),
                    Product.model.ilike(search_term),
                    Product.description.ilike(search_term),
                )
            )
        if min_price is not None:
            q = q.filter(Product.price >= min_price)
        if max_price is not None:
            q = q.filter(Product.price <= max_price)

        total = q.count()
        items = q.order_by(Product.name.asc()).offset(skip).limit(limit).all()
        return items, total

    def create(self, product_in: ProductCreate) -> Product:
        product = Product(
            id=product_in.id,
            name=product_in.name,
            brand=product_in.brand,
            model=product_in.model,
            category=product_in.category,
            description=product_in.description,
            image_url=product_in.image_url,
            additional_images=product_in.additional_images,
            price=product_in.price,
            currency=product_in.currency,
            specifications=product_in.specifications,
            spec_source=product_in.spec_source,
            verification_status=product_in.verification_status,
            is_active=product_in.is_active,
        )
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def upsert(self, product_data: dict) -> Product:
        prod_id = product_data["id"]
        existing = self.db.query(Product).filter(Product.id == prod_id).first()
        if existing:
            for key, val in product_data.items():
                if key != "id":
                    setattr(existing, key, val)
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            product = Product(**product_data)
            self.db.add(product)
            self.db.commit()
            self.db.refresh(product)
            return product
