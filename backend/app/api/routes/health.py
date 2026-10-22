from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.ml_client import MLServiceClient

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    """
    Check application health and dependencies:
    - Database connection
    - AI/ML visual search service connectivity
    """
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    from backend.app.core.config import settings

    if getattr(settings, "ML_SERVICE_URL", "").lower() in ("local", "internal", "embedded"):
        from backend.app.services.faiss_engine import faiss_engine
        from backend.app.services.clip_service import get_clip_service
        clip_service = get_clip_service()
        ml_health = {
            "status": "reachable",
            "details": {
                "status": "healthy" if faiss_engine.is_ready else "degraded",
                "service": "embedded-clip-faiss",
                "model": clip_service.model_id,
                "index_size": faiss_engine.index.ntotal if faiss_engine.index else 0,
                "index_ready": faiss_engine.is_ready,
            }
        }
    else:
        ml_client = MLServiceClient()
        ml_health = ml_client.check_health()

    is_healthy = db_status == "healthy"
    overall_status = "healthy" if (is_healthy and ml_health.get("status") == "reachable") else ("degraded" if is_healthy else "unhealthy")

    return {
        "status": overall_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {
            "database": {
                "status": db_status
            },
            "ml_visual_search_service": ml_health
        }
    }
