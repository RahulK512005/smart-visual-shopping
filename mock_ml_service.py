"""
AI/ML Visual Embedding Search Microservice (Marqo FashionCLIP + FAISS).
Provides:
- GET /internal/health: Health & readiness check with model device and vector count.
- POST /internal/search: Visual search using Marqo/marqo-fashionCLIP and FAISS.
- GET /internal/more-like-this/{product_id}: Nearest visual neighbors for an indexed product.
"""
from contextlib import asynccontextmanager
import io
import time
from typing import List, Optional
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image, UnidentifiedImageError

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.schemas.ml_contract import MLSearchItemResult, MLSearchResponse
from backend.app.services.clip_service import get_clip_service
from backend.app.services.faiss_engine import faiss_engine

# Maximum upload limit from settings (default 10MB)
MAX_UPLOAD_BYTES = getattr(settings, "MAX_UPLOAD_SIZE_BYTES", 10 * 1024 * 1024)
ALLOWED_MIME_TYPES = set(getattr(settings, "allowed_mime_types_list", ["image/jpeg", "image/png", "image/webp"]))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly load FashionCLIP model and verify FAISS index during startup
    logger.info("Initializing Marqo FashionCLIP embedding service...")
    try:
        clip_service = get_clip_service()
        clip_service.load_model()
        logger.info(f"FashionCLIP model ready on device: {clip_service.device}")
    except Exception as exc:
        logger.error(f"Error loading FashionCLIP model during startup: {exc}")

    if not faiss_engine.is_ready:
        logger.info("Loading / building FashionCLIP FAISS vector index...")
        faiss_engine.load_index()

    logger.info(f"Visual embedding microservice ready. Total vectors: {faiss_engine.index.ntotal if faiss_engine.index else 0}")
    yield
    logger.info("Shutting down Visual Embedding Search Service...")


app = FastAPI(
    title="AI/ML Visual Embedding Search Service (Marqo FashionCLIP + FAISS)",
    description="Vector search microservice using Marqo/marqo-fashionCLIP embeddings and FAISS similarity retrieval.",
    version="3.0.0",
    lifespan=lifespan,
)


@app.get("/", include_in_schema=False)
def root():
    return {
        "service": "AI/ML Visual Embedding Search Microservice",
        "model": "Marqo/marqo-fashionCLIP",
        "documentation": "/docs",
        "health": "/internal/health",
        "endpoints": [
            "GET  /internal/health",
            "POST /internal/search",
            "POST /internal/search-text",
            "POST /internal/search-hybrid",
            "GET  /internal/more-like-this/{product_id}",
        ],
    }


@app.get("/internal/health")
def health_check():
    clip_service = get_clip_service()
    index_size = faiss_engine.index.ntotal if faiss_engine.index else 0
    is_ready = clip_service.is_ready and faiss_engine.is_ready

    return {
        "status": "healthy" if is_ready else "degraded",
        "service": "visual-embedding-inference",
        "model": clip_service.model_id,
        "device": str(clip_service.device),
        "version": "v3.0.0",
        "index_size": index_size,
        "index_ready": faiss_engine.is_ready,
    }


@app.post("/internal/search", response_model=MLSearchResponse)
async def search_visual_similarity(
    file: UploadFile = File(..., description="Query image file (JPEG, PNG, WebP)"),
    limit: int = Form(10, description="Max results to return"),
    category_filter: Optional[str] = Form(None, description="Optional category filter"),
):
    start_time = time.time()

    # 1. Validate MIME type
    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{content_type}'. Allowed: {', '.join(sorted(ALLOWED_MIME_TYPES))}",
        )

    # 2. Read bytes safely with size check
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(contents) > MAX_UPLOAD_BYTES:
        max_mb = MAX_UPLOAD_BYTES / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed limit of {max_mb:.1f}MB.",
        )

    # 3. Readability & integrity verification
    try:
        stream = io.BytesIO(contents)
        with Image.open(stream) as img:
            img.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupted or invalid image file: {exc}",
        )

    # 4. Check FAISS index availability
    if not faiss_engine.is_ready:
        if not faiss_engine.load_index() or not faiss_engine.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vector search index is not available. Please build the index.",
            )

    # 5. Execute vector search
    try:
        raw_results = faiss_engine.search_by_image_bytes(
            image_bytes=contents,
            limit=limit,
            category_filter=category_filter,
        )
    except Exception as exc:
        logger.error(f"Inference error during vector search: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Visual search inference error: {exc}",
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

    inference_ms = round((time.time() - start_time) * 1000, 2)
    clip_service = get_clip_service()

    return MLSearchResponse(
        results=items,
        model_version=f"{clip_service.model_id}:v3.0.0",
        inference_time_ms=inference_ms,
    )


class MLTextSearchRequest(BaseModel):
    query: str
    limit: int = 10
    category_filter: Optional[str] = None


@app.post("/internal/search-text", response_model=MLSearchResponse)
def search_text_similarity(payload: MLTextSearchRequest):
    start_time = time.time()
    if not faiss_engine.is_ready:
        if not faiss_engine.load_index() or not faiss_engine.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vector search index is not available. Please build the index.",
            )

    try:
        raw_results = faiss_engine.search_by_text(
            query_text=payload.query,
            limit=payload.limit,
            category_filter=payload.category_filter,
        )
    except Exception as exc:
        logger.error(f"Inference error during text vector search: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"FashionCLIP text inference error: {exc}",
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

    inference_ms = round((time.time() - start_time) * 1000, 2)
    clip_service = get_clip_service()

    return MLSearchResponse(
        results=items,
        model_version=f"{clip_service.model_id}:v3.0.0",
        inference_time_ms=inference_ms,
    )


@app.post("/internal/search-hybrid", response_model=MLSearchResponse)
async def search_hybrid_similarity(
    file: UploadFile = File(..., description="Query image file (JPEG, PNG, WebP)"),
    query: str = Form(..., description="Query text instructions"),
    image_weight: float = Form(0.7, description="Weight for image embedding"),
    text_weight: float = Form(0.3, description="Weight for text embedding"),
    limit: int = Form(10, description="Max results to return"),
    category_filter: Optional[str] = Form(None, description="Optional category filter"),
):
    start_time = time.time()

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{content_type}'. Allowed: {', '.join(sorted(ALLOWED_MIME_TYPES))}",
        )

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size exceeds limit.")

    try:
        stream = io.BytesIO(contents)
        with Image.open(stream) as img:
            img.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Corrupted or invalid image: {exc}")

    if not faiss_engine.is_ready:
        if not faiss_engine.load_index() or not faiss_engine.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vector search index is not available. Please build the index.",
            )

    try:
        raw_results = faiss_engine.search_hybrid(
            image_bytes=contents,
            query_text=query,
            image_weight=image_weight,
            text_weight=text_weight,
            limit=limit,
            category_filter=category_filter,
        )
    except Exception as exc:
        logger.error(f"Inference error during hybrid vector search: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hybrid search inference error: {exc}",
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

    inference_ms = round((time.time() - start_time) * 1000, 2)
    clip_service = get_clip_service()

    return MLSearchResponse(
        results=items,
        model_version=f"{clip_service.model_id}:v3.0.0",
        inference_time_ms=inference_ms,
    )



@app.get("/internal/more-like-this/{product_id}", response_model=MLSearchResponse)
def more_like_this(product_id: str, limit: int = 6):
    start_time = time.time()

    if not faiss_engine.is_ready:
        if not faiss_engine.load_index() or not faiss_engine.is_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vector search index is not available. Please build the index.",
            )

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

    inference_ms = round((time.time() - start_time) * 1000, 2)
    clip_service = get_clip_service()

    return MLSearchResponse(
        results=items,
        model_version=f"{clip_service.model_id}:v3.0.0",
        inference_time_ms=inference_ms,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mock_ml_service:app", host="127.0.0.1", port=8001, reload=True)
