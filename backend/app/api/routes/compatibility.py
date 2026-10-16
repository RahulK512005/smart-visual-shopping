from fastapi import APIRouter, Depends, File, UploadFile
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


@router.post("/identify-photo")
async def identify_owned_photo(
    file: UploadFile = File(..., description="Uploaded photo of the product you own"),
    db: Session = Depends(get_db),
):
    """
    POST /api/compatibility/identify-photo
    Identifies the product the user owns from an uploaded photo using FAISS vector search.
    """
    from backend.app.services.faiss_engine import faiss_engine
    from backend.app.db.repositories.product_repo import ProductRepository
    from backend.app.schemas.product import ProductRead

    contents = await file.read()
    raw_results = faiss_engine.search_by_image_bytes(contents, limit=3)
    if not raw_results:
        return {"identified": None, "candidates": []}

    repo = ProductRepository(db)
    top_id = raw_results[0]["product_id"]
    top_prod = repo.get_by_id(top_id)
    cand_ids = [r["product_id"] for r in raw_results]
    all_prods = {p.id: p for p in repo.get_by_ids(cand_ids)}

    candidates = [
        {
            "product": ProductRead.model_validate(all_prods[r["product_id"]]),
            "score": r["score"],
            "explanation": r.get("similarity_explanation"),
        }
        for r in raw_results
        if r["product_id"] in all_prods
    ]

    return {
        "identified": ProductRead.model_validate(top_prod) if top_prod else None,
        "confidence": raw_results[0]["score"],
        "candidates": candidates,
    }

