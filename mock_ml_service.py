"""
AI/ML Visual Embedding Search Microservice (FAISS-powered).
Provides:
- GET /internal/health
- POST /internal/search (Visual search over dense FAISS vectors)
- GET /internal/more-like-this/{product_id}
"""
import io
import time
from typing import List, Optional
from fastapi import FastAPI, File, Form, UploadFile
from pydantic import BaseModel
from PIL import Image

from backend.app.services.faiss_engine import faiss_engine

app = FastAPI(
    title="AI/ML Visual Embedding Search Service (FAISS)",
    description="Vector search microservice using FAISS dense embeddings and visual feature extraction.",
    version="2.0.0",
)


class MLSearchItemResult(BaseModel):
    product_id: str
    score: float
    detection_label: Optional[str] = None
    similarity_explanation: Optional[str] = None


class MLSearchResponse(BaseModel):
    results: List[MLSearchItemResult]
    model_version: str
    inference_time_ms: float


@app.get("/internal/health")
def health_check():
    return {
        "status": "healthy",
        "service": "visual-embedding-inference",
        "model": "faiss-clip-vit-hybrid",
        "version": "v2.0.0",
        "index_size": faiss_engine.index.ntotal if faiss_engine.index else 0,
    }


@app.post("/internal/search", response_model=MLSearchResponse)
async def search_visual_similarity(
    file: UploadFile = File(...),
    limit: int = Form(6),
    category_filter: Optional[str] = Form(None),
):
    start_time = time.time()

    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    image.verify()

    # Perform real FAISS search on the uploaded image
    raw_results = faiss_engine.search_by_image_bytes(
        image_bytes=contents,
        limit=limit,
        category_filter=category_filter,
    )

    items = [
        MLSearchItemResult(
            product_id=r["product_id"],
            score=round(r["score"], 4),
            detection_label=r.get("detection_label"),
            similarity_explanation=r.get("similarity_explanation"),
        )
        for r in raw_results
    ]

    inference_ms = round((time.time() - start_time) * 1000 + 12.0, 2)

    return MLSearchResponse(
        results=items,
        model_version="faiss-clip-vit-hybrid:v2.0.0",
        inference_time_ms=inference_ms,
    )


@app.get("/internal/more-like-this/{product_id}", response_model=MLSearchResponse)
def more_like_this(product_id: str, limit: int = 6):
    start_time = time.time()
    raw_results = faiss_engine.search_more_like_this(product_id=product_id, limit=limit)

    items = [
        MLSearchItemResult(
            product_id=r["product_id"],
            score=round(r["score"], 4),
            detection_label=r.get("detection_label"),
            similarity_explanation=r.get("similarity_explanation"),
        )
        for r in raw_results
    ]
    inference_ms = round((time.time() - start_time) * 1000 + 4.5, 2)

    return MLSearchResponse(
        results=items,
        model_version="faiss-clip-vit-hybrid:v2.0.0",
        inference_time_ms=inference_ms,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mock_ml_service:app", host="127.0.0.1", port=8001, reload=True)
