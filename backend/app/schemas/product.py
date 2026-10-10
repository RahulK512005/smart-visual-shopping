from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Product title/name")
    brand: str = Field(..., min_length=1, max_length=100, description="Manufacturer brand")
    model: str = Field(..., min_length=1, max_length=100, description="Manufacturer model identifier")
    category: str = Field(..., min_length=1, max_length=100, description="Product category identifier")
    description: Optional[str] = Field(None, description="Detailed product description")
    image_url: str = Field(..., description="Primary image URL")
    additional_images: List[str] = Field(default_factory=list, description="Additional image URLs")
    price: Optional[float] = Field(None, ge=0.0, description="Retail price")
    currency: str = Field(default="USD", max_length=10, description="ISO currency code")
    specifications: Dict[str, Any] = Field(default_factory=dict, description="Structured specifications dictionary")
    spec_source: Optional[str] = Field(default="manufacturer_datasheet", description="Source documentation for specifications")
    verification_status: str = Field(default="verified", description="Specification verification status (verified, unverified, pending_review)")
    is_active: bool = Field(default=True, description="Whether product is active in catalog")


class ProductCreate(ProductBase):
    id: str = Field(..., min_length=3, max_length=100, description="Unique product ID")


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    additional_images: Optional[List[str]] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    spec_source: Optional[str] = None
    verification_status: Optional[str] = None
    is_active: Optional[bool] = None


class ProductRead(ProductBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    items: List[ProductRead]
    total: int
    page: int
    page_size: int
    total_pages: int
