from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, JSON, Index
from backend.app.db.session import Base


class Product(Base):
    __tablename__ = "products"

    # Stable product identifier (e.g. "prod_apple_iphone_15_pro")
    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    brand = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Images
    image_url = Column(String(500), nullable=False)
    additional_images = Column(JSON, default=list, nullable=False)

    # Pricing
    price = Column(Float, nullable=True)
    currency = Column(String(10), default="USD", nullable=False)

    # Structured specifications (flexible JSON with validated typed fields)
    specifications = Column(JSON, default=dict, nullable=False)

    # Provenance and verification
    spec_source = Column(String(255), nullable=True, default="manufacturer_datasheet")
    verification_status = Column(String(50), default="verified", nullable=False)  # verified | unverified | pending_review

    # Operational status & timestamps
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_products_category_brand", "category", "brand"),
    )

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name={self.name}, category={self.category})>"
