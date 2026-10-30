import json
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.search import UniversalSearchResponse, UniversalSearchTextRequest
from backend.app.services.fashion_search_orchestrator import FashionSearchOrchestrator

router = APIRouter(prefix="/search", tags=["Universal AI Fashion Search"])


@router.post("", response_model=UniversalSearchResponse)
async def perform_universal_search(
    request: Request,
    db: Session = Depends(get_db),
    file: Optional[UploadFile] = File(None, description="Optional image file for visual or hybrid search"),
    query: Optional[str] = Form(None, description="Natural language search query"),
    mode: Optional[str] = Form(None, description="Search mode: text | image | hybrid"),
    limit: int = Form(12, description="Max results"),
    image_weight: float = Form(0.7, description="Image weight for hybrid search"),
    text_weight: float = Form(0.3, description="Text weight for hybrid search"),
    category: Optional[str] = Form(None, description="Optional category filter"),
    brand: Optional[str] = Form(None, description="Optional brand filter"),
    colour: Optional[str] = Form(None, description="Optional colour filter"),
    style: Optional[str] = Form(None, description="Optional style filter"),
    min_price: Optional[float] = Form(None, description="Minimum price filter"),
    max_price: Optional[float] = Form(None, description="Maximum price filter"),
):
    """
    POST /api/search
    Universal AI-powered fashion search using Marqo FashionCLIP & FAISS.
    Supports:
    - Text-only natural language queries (JSON or Form).
    - Image-only visual similarity search (multipart file).
    - Hybrid multimodal search (image file + text query).
    """
    # 1. Handle JSON request body if content-type is application/json
    content_type = (request.headers.get("content-type") or "").lower()
    manual_filters: Dict[str, Any] = {}

    if "application/json" in content_type:
        try:
            body = await request.json()
            query = body.get("query") or query
            mode = body.get("mode") or mode or "text"
            limit = body.get("limit") or limit
            image_weight = float(body.get("image_weight", image_weight))
            text_weight = float(body.get("text_weight", text_weight))
            for key in ["category", "brand", "colour", "style", "min_price", "max_price"]:
                if key in body and body[key] is not None:
                    manual_filters[key] = body[key]
        except Exception:
            pass

    # Populate manual filters from form values if present
    for k, v in [
        ("category", category),
        ("brand", brand),
        ("colour", colour),
        ("style", style),
        ("min_price", min_price),
        ("max_price", max_price),
    ]:
        if v is not None and k not in manual_filters:
            manual_filters[k] = v

    orchestrator = FashionSearchOrchestrator(db=db)

    # 2. Determine search mode cleanly without guessing
    has_file = file is not None and file.filename
    has_text = bool((query or "").strip())

    if not has_file and not has_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either a text query or an image file must be provided for fashion search.",
        )

    if has_file and has_text:
        effective_mode = mode if mode in ("text", "image", "hybrid") else "hybrid"
    elif has_file:
        effective_mode = "image"
    else:
        effective_mode = "text"

    # 3. Route to corresponding orchestrator search handler
    if effective_mode == "text":
        return await orchestrator.search_text(
            query=query or "",
            limit=limit,
            manual_filters=manual_filters,
        )
    elif effective_mode == "image":
        return await orchestrator.search_image(
            upload_file=file,
            limit=limit,
            manual_filters=manual_filters,
        )
    else:  # hybrid
        return await orchestrator.search_hybrid(
            upload_file=file,
            query=query or "",
            image_weight=image_weight,
            text_weight=text_weight,
            limit=limit,
            manual_filters=manual_filters,
        )


@router.get("", response_model=UniversalSearchResponse)
async def perform_search_get(
    q: str = Query(..., description="Natural language search query"),
    limit: int = Query(12, ge=1, le=50),
    category: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    """
    GET /api/search?q=...
    Convenience endpoint for text queries.
    """
    manual_filters = {
        k: v for k, v in [
            ("category", category),
            ("brand", brand),
            ("min_price", min_price),
            ("max_price", max_price),
        ] if v is not None
    }
    orchestrator = FashionSearchOrchestrator(db=db)
    return await orchestrator.search_text(
        query=q,
        limit=limit,
        manual_filters=manual_filters,
    )

