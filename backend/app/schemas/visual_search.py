from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.product import ProductRead


class QueryImageMetadata(BaseModel):
    filename: Optional[str] = None
    content_type: str
    size_bytes: int
    width: Optional[int] = None
    height: Optional[int] = None
    format: Optional[str] = None


class VisualSearchResultItem(BaseModel):
    rank: int = Field(..., ge=1, description="1-based rank preserved directly from ML service ordering")
    similarity_score: float = Field(..., ge=0.0, le=1.0, description="Similarity score from visual embedding search")
    product: ProductRead = Field(..., description="Full enriched catalog product details")


# Convenience alias
VisualSearchMatch = VisualSearchResultItem


class VisualSearchResponse(BaseModel):
    query_image: QueryImageMetadata
    total_matches: int
    results: List[VisualSearchResultItem]
