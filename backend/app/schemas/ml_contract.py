from typing import List, Optional
from pydantic import BaseModel, Field


class MLSearchItemResult(BaseModel):
    product_id: str = Field(..., description="Stable catalog product ID identified by ML model")
    score: float = Field(..., ge=0.0, le=1.0, description="Normalized similarity or confidence score")
    detection_label: Optional[str] = Field(None, description="Optional predicted label or detected class from ML")


class MLSearchResponse(BaseModel):
    results: List[MLSearchItemResult] = Field(
        default_factory=list,
        description="Ranked list of product matches returned by the AI/ML visual embedding search"
    )
    model_version: Optional[str] = Field(None, description="AI model version/tag used for inference")
    inference_time_ms: Optional[float] = Field(None, description="Inference latency in milliseconds")
