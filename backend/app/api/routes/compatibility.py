from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.compatibility import (
    CompatibilityCheckRequest,
    CompatibilityCheckResponse,
)
from backend.app.services.compatibility_service import CompatibilityService

router = APIRouter(prefix="/compatibility", tags=["Compatibility Engine"])


@router.post("/check", response_model=CompatibilityCheckResponse)
def check_compatibility(
    payload: CompatibilityCheckRequest,
    db: Session = Depends(get_db),
):
    """
    POST /api/compatibility/check
    Evaluates compatibility between existing product and candidate product using
    deterministic, category-specific rules.

    Returns:
    - verdict: compatible | incompatible | cannot_verify
    - passed_checks: details of verified passing rules
    - failed_checks: details of failed compatibility requirements
    - cannot_verify_checks: unverified properties or missing specifications
    - summary_explanation: transparent human-readable explanation
    """
    service = CompatibilityService(db=db)
    return service.evaluate(
        existing_product_id=payload.existing_product_id,
        candidate_product_id=payload.candidate_product_id,
        context=payload.context,
    )
