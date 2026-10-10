"""
Mock AI/ML Visual Embedding Search Service.
Runs as an independent microservice demonstrating the agreed integration contract:
- GET /internal/health
- POST /internal/search

Usage:
    uvicorn mock_ml_service:app --port 8001 --reload
"""
import io
import time
from typing import List, Optional
from fastapi import FastAPI, File, Form, UploadFile
from pydantic import BaseModel
from PIL import Image

app = FastAPI(
    title="Mock AI/ML Visual Embedding Search Service",
    description="Standalone mock simulating the AI/ML vector search microservice contract.",
    version="1.0.0",
)


class MLSearchItemResult(BaseModel):
    product_id: str
    score: float
    detection_label: Optional[str] = None


class MLSearchResponse(BaseModel):
    results: List[MLSearchItemResult]
    model_version: str
    inference_time_ms: float


@app.get("/internal/health")
def health_check():
    return {
        "status": "healthy",
        "service": "visual-embedding-inference",
        "model": "clip-vit-base-patch32-mock",
        "version": "v1.2.0"
    }


@app.post("/internal/search", response_model=MLSearchResponse)
async def search_visual_similarity(
    file: UploadFile = File(...),
    limit: int = Form(10),
):
    start_time = time.time()
    
    # Read bytes and verify image header to simulate inference pipeline
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    image.verify()

    # Pre-configured ranked candidate responses based on catalog
    # Simulates ML vector similarity search over embeddings
    sample_ranked_candidates = [
        MLSearchItemResult(
            product_id="prod_apple_iphone_15_pro",
            score=0.9421,
            detection_label="smartphone_titanium"
        ),
        MLSearchItemResult(
            product_id="prod_apple_iphone_14",
            score=0.8845,
            detection_label="smartphone_aluminum"
        ),
        MLSearchItemResult(
            product_id="prod_anker_737_charger_120w",
            score=0.7632,
            detection_label="gan_power_adapter"
        ),
        MLSearchItemResult(
            product_id="prod_anker_usbc_to_usbc_100w_cable",
            score=0.6914,
            detection_label="usbc_cable"
        ),
        MLSearchItemResult(
            product_id="prod_apple_case_iphone_15_pro_finewoven",
            score=0.6520,
            detection_label="magsafe_case"
        ),
    ]

    inference_ms = round((time.time() - start_time) * 1000 + 42.5, 2)

    return MLSearchResponse(
        results=sample_ranked_candidates[:limit],
        model_version="clip-vit-base-patch32-mock:v1.2.0",
        inference_time_ms=inference_ms,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mock_ml_service:app", host="127.0.0.1", port=8001, reload=True)
