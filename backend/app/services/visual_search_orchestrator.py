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
        except (UnidentifiedImageError, OSError, SyntaxError) as exc:
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

        # 4. Call separately implemented AI/ML service
        ml_response = self.ml_client.search_by_image(
            image_bytes=file_bytes,
            filename=upload_file.filename or "query.jpg",
            content_type=content_type,
            limit=limit,
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

            enriched_results.append(
                VisualSearchResultItem(
                    rank=current_rank,
                    similarity_score=round(ml_item.score, 4),
                    product=ProductRead.model_validate(product),
                )
            )
            current_rank += 1

        return VisualSearchResponse(
            query_image=metadata,
            total_matches=len(enriched_results),
            results=enriched_results,
        )
