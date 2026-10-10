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
