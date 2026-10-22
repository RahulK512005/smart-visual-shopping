import io
from typing import Optional
from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.errors import InvalidImageError
from backend.app.core.logging import logger
from backend.app.db.repositories.product_repo import ProductRepository
from backend.app.schemas.product import ProductRead
from backend.app.schemas.visual_search import (
    QueryImageMetadata,
    VisualSearchMatch,
    VisualSearchResultItem,
    VisualSearchResponse,
)
from backend.app.services.ml_client import MLServiceClient


Image.MAX_IMAGE_PIXELS = 20_000_000


class VisualSearchOrchestrator:
    """
    Orchestrates the visual product search pipeline:
    1. Validates image payload, size, and header readability.
    2. Invokes external AI/ML service client.
    3. Retrieves catalog products and preserves the exact ML ranking order.
    4. Enriches results with verified product specifications.
    """

    def __init__(self, db: Session, ml_client: Optional[MLServiceClient] = None):
        self.db = db
        self.repo = ProductRepository(db)
        self.ml_client = ml_client or MLServiceClient()

    async def orchestrate_search(
        self,
        upload_file: UploadFile,
        limit: int = 10,
        min_score: float = 0.0,
        category_filter: Optional[str] = None,
    ) -> VisualSearchResponse:
        # 1. Content-Type validation
        content_type = upload_file.content_type or "application/octet-stream"
        if content_type.lower() not in settings.allowed_mime_types_list:
            raise InvalidImageError(
                f"Unsupported image type '{content_type}'. Allowed types: {', '.join(settings.allowed_mime_types_list)}",
                error_code="UNSUPPORTED_MEDIA_TYPE",
            )

        # 2. Read bytes safely into memory
        file_bytes = await upload_file.read()
        file_size = len(file_bytes)

        if file_size == 0:
            raise InvalidImageError("Uploaded file is empty.", error_code="EMPTY_FILE")

        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
            raise InvalidImageError(
                f"File size {file_size} bytes exceeds maximum allowed limit of {max_mb:.1f}MB.",
                error_code="FILE_TOO_LARGE",
            )

        # 3. Basic image readability and integrity validation using Pillow
        try:
            image_stream = io.BytesIO(file_bytes)
            with Image.open(image_stream) as img:
                img_format = img.format
                width, height = img.size
                # Basic verification of integrity
                img.verify()
        except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
            logger.warning(f"Failed image integrity check: {exc}")
            raise InvalidImageError(
                "Uploaded file is corrupt or not a readable image.",
                error_code="CORRUPT_IMAGE",
            )

        metadata = QueryImageMetadata(
            filename=upload_file.filename,
            content_type=content_type,
            size_bytes=file_size,
            width=width,
            height=height,
            format=img_format,
        )

        # 4. Call AI/ML visual embedding search service
        if getattr(settings, "ML_SERVICE_URL", "").lower() in ("local", "internal", "embedded"):
            from backend.app.schemas.ml_contract import MLSearchItemResult, MLSearchResponse
            from backend.app.services.faiss_engine import faiss_engine
            from backend.app.services.clip_service import get_clip_service

            clip_service = get_clip_service()
            raw_results = faiss_engine.search_by_image_bytes(
                image_bytes=file_bytes,
                limit=limit,
                category_filter=category_filter,
            )
            ml_response = MLSearchResponse(
                results=[
                    MLSearchItemResult(
                        product_id=r["product_id"],
                        score=r["score"],
                        detection_label=r.get("detection_label"),
                        similarity_explanation=r.get("similarity_explanation"),
                    )
                    for r in raw_results
                ],
                model_version=f"{clip_service.model_id}:embedded",
                inference_time_ms=18.0,
            )
        else:
            ml_response = self.ml_client.search_by_image(
                image_bytes=file_bytes,
                filename=upload_file.filename or "query.jpg",
                content_type=content_type,
                limit=limit,
                category_filter=category_filter,
            )

        # 5. Extract ranked product IDs from ML results
        ranked_ml_items = [
            item for item in ml_response.results
            if item.score >= min_score
        ]
        candidate_ids = [item.product_id for item in ranked_ml_items]

        # 6. Retrieve product records from database catalog
        db_products = self.repo.get_by_ids(candidate_ids)
        product_map = {prod.id: prod for prod in db_products}

        # 7. Preserve exact ranking order received from ML service
        enriched_results = []
        current_rank = 1

        for ml_item in ranked_ml_items:
            product = product_map.get(ml_item.product_id)
            if not product:
                logger.warning(
                    f"Product ID '{ml_item.product_id}' returned by ML service was not found in catalog. Skipping."
                )
                continue

            if category_filter and product.category.lower() != category_filter.lower():
                continue

            enriched_results.append(
                VisualSearchResultItem(
                    rank=current_rank,
                    similarity_score=round(ml_item.score, 4),
                    product=ProductRead.model_validate(product),
                    similarity_explanation=ml_item.similarity_explanation or f"Matching visual form factor and {product.category} profile",
                )
            )
            current_rank += 1

        return VisualSearchResponse(
            query_image=metadata,
            total_matches=len(enriched_results),
            results=enriched_results,
        )

    def search_more_like_this(self, product_id: str, limit: int = 6) -> VisualSearchResponse:
        from backend.app.core.errors import ProductNotFoundError
        from backend.app.services.faiss_engine import faiss_engine

        target_prod = self.repo.get_by_id(product_id)
        if not target_prod:
            raise ProductNotFoundError(product_id)

        raw_results = faiss_engine.search_more_like_this(product_id=product_id, limit=limit)
        candidate_ids = [r["product_id"] for r in raw_results]
        db_products = self.repo.get_by_ids(candidate_ids)
        product_map = {prod.id: prod for prod in db_products}

        enriched_results = []
        for rank, r in enumerate(raw_results, 1):
            product = product_map.get(r["product_id"])
            if not product:
                continue
            enriched_results.append(
                VisualSearchResultItem(
                    rank=rank,
                    similarity_score=round(r["score"], 4),
                    product=ProductRead.model_validate(product),
                    similarity_explanation=r.get("similarity_explanation"),
                )
            )

        return VisualSearchResponse(
            query_image=QueryImageMetadata(
                filename=f"{product_id}.jpg",
                content_type="image/jpeg",
                size_bytes=1024,
                width=600,
                height=600,
                format="JPEG"
            ),
            total_matches=len(enriched_results),
            results=enriched_results,
        )

