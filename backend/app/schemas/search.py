from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.product import ProductRead
from backend.app.schemas.visual_search import QueryImageMetadata, VisualSearchResultItem

SearchMode = Literal["text", "image", "hybrid"]


class FashionFilterParams(BaseModel):
    category: Optional[str] = None
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    colour: Optional[str] = None
    style: Optional[str] = None
    gender: Optional[str] = None
    occasion: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None


class UniversalSearchTextRequest(BaseModel):
    query: str = Field(..., description="Natural language search query or style prompt")
    mode: SearchMode = "text"
    limit: int = Field(12, ge=1, le=50)
    category: Optional[str] = None
    brand: Optional[str] = None
    colour: Optional[str] = None
    style: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None


class UniversalSearchResponse(BaseModel):
    query: Optional[str] = None
    mode: SearchMode
    total_matches: int
    extracted_filters: Optional[Dict[str, Any]] = None
    results: List[VisualSearchResultItem]
    query_image: Optional[QueryImageMetadata] = None
    inference_time_ms: Optional[float] = None

