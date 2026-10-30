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
async def check_compatibility(
    payload: CompatibilityCheckRequest,
    db: Session = Depends(get_db),
):
    print(">>> ENTERED check_compatibility route handler!", flush=True)
    service = CompatibilityService(db=db)
    result = service.evaluate(
        existing_product_id=payload.existing_product_id,
        candidate_product_id=payload.candidate_product_id,
        context=payload.context,
    )
    print(">>> COMPLETED evaluate in route handler!", flush=True)
    return result


@router.post("/identify-photo")
async def identify_owned_photo(
    file: UploadFile = File(..., description="Uploaded photo of the product you own"),
    db: Session = Depends(get_db),
):
    from io import BytesIO
    from PIL import Image
    from backend.app.core.config import settings
    from backend.app.core.errors import InvalidImageError
    from backend.app.services.faiss_engine import faiss_engine
    from backend.app.db.repositories.product_repo import ProductRepository
    from backend.app.schemas.product import ProductRead

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in settings.allowed_mime_types_list:
        raise InvalidImageError(f"Unsupported image type '{content_type}'.", error_code="UNSUPPORTED_MEDIA_TYPE")

    contents = await file.read()
    if not contents:
        raise InvalidImageError("Uploaded file is empty.", error_code="EMPTY_FILE")
    if len(contents) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise InvalidImageError("File size exceeds maximum allowed limit.", error_code="FILE_TOO_LARGE")

    try:
        with Image.open(BytesIO(contents)) as img:
            img.verify()
    except Exception:
        raise InvalidImageError("Uploaded file is corrupt or not a readable image.", error_code="CORRUPT_IMAGE")

    from starlette.concurrency import run_in_threadpool
    raw_results = await run_in_threadpool(faiss_engine.search_by_image_bytes, contents, limit=3)
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
