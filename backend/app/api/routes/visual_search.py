from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.visual_search import VisualSearchResponse
from backend.app.services.visual_search_orchestrator import VisualSearchOrchestrator

router = APIRouter(prefix="/visual-search", tags=["Visual Search"])


@router.post("", response_model=VisualSearchResponse)
async def perform_visual_search(
    file: UploadFile = File(..., description="Uploaded query image (JPEG, PNG, WebP)"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of matches to return"),
    min_score: float = Query(0.0, ge=0.0, le=1.0, description="Minimum confidence/similarity threshold"),
    db: Session = Depends(get_db),
):
    """
    POST /api/visual-search
    1. Validates uploaded image format and file integrity.
    2. Calls internal AI/ML visual embedding search service.
    3. Preserves ML service ranking while enriching results with verified catalog details.
    """
    orchestrator = VisualSearchOrchestrator(db=db)
    return await orchestrator.orchestrate_search(
        upload_file=file,
        limit=limit,
        min_score=min_score,
    )


@router.get("/more-like-this/{product_id}", response_model=VisualSearchResponse)
def get_more_like_this(
    product_id: str,
    limit: int = Query(6, ge=1, le=50, description="Maximum number of similar products to return"),
    db: Session = Depends(get_db),
):
    """
    GET /api/visual-search/more-like-this/{product_id}
    Retrieves the nearest visual neighbors using FAISS dense embeddings.
    """
    orchestrator = VisualSearchOrchestrator(db=db)
    return orchestrator.search_more_like_this(product_id=product_id, limit=limit)

