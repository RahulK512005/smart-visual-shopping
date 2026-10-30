import io
import time
from typing import Any, Dict, List, Optional, Tuple
from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from backend.app.core.config import settings
from backend.app.core.errors import InvalidImageError
from backend.app.core.logging import logger
from backend.app.db.models import Product
from backend.app.db.repositories.product_repo import ProductRepository
from backend.app.schemas.product import ProductRead
from backend.app.schemas.search import (
    SearchMode,
    UniversalSearchResponse,
)
from backend.app.schemas.visual_search import (
    QueryImageMetadata,
    VisualSearchResultItem,
)
from backend.app.services.faiss_engine import faiss_engine
from backend.app.services.ml_client import MLServiceClient
from backend.app.services.query_understanding import (
    ExtractedFashionQuery,
    query_understanding_service,
)


class FashionSearchOrchestrator:
    """
    Universal Fashion Search Orchestrator using Marqo FashionCLIP & FAISS.
    Coordinates:
    1. Natural-language query understanding (extracts category, subcategory, colour, style, price, brand).
    2. FashionCLIP text-to-image semantic vector search.
    3. FashionCLIP image-based visual similarity search.
    4. Multimodal hybrid (image + text) search with configurable weighting.
    5. Database metadata filtering (price constraints, category, brand, style).
    6. Ranked response enrichment with verified catalog specifications.
    """

    def __init__(self, db: Session, ml_client: Optional[MLServiceClient] = None):
        self.db = db
        self.repo = ProductRepository(db)
        self.ml_client = ml_client or MLServiceClient()

    def _apply_metadata_filters(
        self,
        products: List[Product],
        extracted: ExtractedFashionQuery,
        manual_filters: Optional[Dict[str, Any]] = None,
    ) -> List[Product]:
        """
        Applies SQL-backed metadata filtering for exact constraints (price bounds, category, brand, colour, style).
        """
        filters = manual_filters or {}
        cat_filter = filters.get("category") or extracted.category
        brand_filter = filters.get("brand") or extracted.brand
        min_p = filters.get("min_price") if filters.get("min_price") is not None else extracted.min_price
        max_p = filters.get("max_price") if filters.get("max_price") is not None else extracted.max_price
        colour_filter = (filters.get("colour") or extracted.colour or "").lower()
        style_filter = (filters.get("style") or extracted.style or "").lower()
        gender_filter = (filters.get("gender") or extracted.gender or "").lower()

        filtered = []
        for p in products:
            specs = p.specifications or {}

            # Price filtering
            if p.price is not None:
                if min_p is not None and p.price < min_p:
                    continue
                if max_p is not None and p.price > max_p:
                    continue

            # Category filtering
            if cat_filter:
                p_cat = (p.category or "").lower()
                c_filter = cat_filter.lower()
                if p_cat != c_filter and c_filter not in p_cat:
                    continue

            # Brand filtering
            if brand_filter:
                p_brand = (p.brand or "").lower()
                if brand_filter.lower() not in p_brand:
                    continue

            # Colour filtering
            if colour_filter:
                p_col = str(specs.get("colour", "")).lower()
                p_name_desc = f"{p.name} {p.description or ''}".lower()
                if colour_filter != p_col and colour_filter not in p_name_desc:
                    continue

            # Style filtering
            if style_filter:
                p_style = str(specs.get("style", "")).lower()
                p_name_desc = f"{p.name} {p.description or ''}".lower()
                if style_filter != p_style and style_filter not in p_name_desc:
                    continue

            # Gender filtering (allow unisex products to match men or women)
            if gender_filter:
                p_gender = str(specs.get("gender", "")).lower()
                if p_gender and p_gender != "unisex" and p_gender != gender_filter:
                    continue

            filtered.append(p)

        return filtered

    async def search_text(
        self,
        query: str,
        limit: int = 12,
        manual_filters: Optional[Dict[str, Any]] = None,
    ) -> UniversalSearchResponse:
        """
        Executes text-to-image semantic fashion search using Marqo FashionCLIP and FAISS.
        """
        start_time = time.time()
        extracted = query_understanding_service.parse_query(query)
        cat_filter = (manual_filters or {}).get("category") or extracted.category

        # Candidate retrieval via vector similarity
        use_embedded = getattr(settings, "ML_SERVICE_URL", "").lower() in ("local", "internal", "embedded")
        candidate_items = []

        if use_embedded or not self.ml_client:
            raw_results = await run_in_threadpool(
                faiss_engine.search_by_text,
                query_text=extracted.query_text or extracted.raw_query,
                limit=max(limit * 3, 30),
                category_filter=cat_filter,
            )
            candidate_items = raw_results
        else:
            try:
                ml_res = await run_in_threadpool(
                    self.ml_client.search_by_text,
                    query=extracted.query_text or extracted.raw_query,
                    limit=max(limit * 3, 30),
                    category_filter=cat_filter,
                )
                candidate_items = [
                    {
                        "product_id": item.product_id,
                        "score": item.score,
                        "similarity_explanation": item.similarity_explanation,
                    }
                    for item in ml_res.results
                ]
            except Exception as exc:
                logger.warning(f"ML microservice call failed ({exc}); falling back to local FAISS engine.")
                raw_results = await run_in_threadpool(
                    faiss_engine.search_by_text,
                    query_text=extracted.query_text or extracted.raw_query,
                    limit=max(limit * 3, 30),
                    category_filter=cat_filter,
                )
                candidate_items = raw_results

        # Candidate enrichment and metadata filtering
        candidate_ids = [c["product_id"] for c in candidate_items]
        db_products = self.repo.get_by_ids(candidate_ids)
        product_map = {p.id: p for p in db_products}

        # Preserve exact vector ranking order
        ordered_products = [product_map[cid] for cid in candidate_ids if cid in product_map]
        filtered_products = self._apply_metadata_filters(ordered_products, extracted, manual_filters)

        # Fallback to ranked semantic candidates if strict filters produce 0 matches
        final_products = filtered_products if filtered_products else ordered_products

        # In Fashion Search, prioritize fashion catalog products over legacy items
        fashion_cats = {"clothing", "footwear", "accessories", "watches"}
        fashion_first = [p for p in final_products if (p.category or "").lower() in fashion_cats]
        other_products = [p for p in final_products if (p.category or "").lower() not in fashion_cats]
        final_products = (fashion_first + other_products) if fashion_first else final_products

        # Map scores
        scores_map = {c["product_id"]: c for c in candidate_items}
        results: List[VisualSearchResultItem] = []

        for rank, prod in enumerate(final_products[:limit], start=1):
            c_info = scores_map.get(prod.id, {})
            score = round(float(c_info.get("score", 0.85)), 4)
            explanation = c_info.get("similarity_explanation") or (
                f"Semantic match for '{extracted.query_text}' with {prod.brand} {prod.name}"
            )
            results.append(
                VisualSearchResultItem(
                    rank=rank,
                    similarity_score=score,
                    product=ProductRead.model_validate(prod),
                    similarity_explanation=explanation,
                )
            )

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        extracted_dict = extracted.model_dump(exclude_none=True)

        return UniversalSearchResponse(
            query=query,
            mode="text",
            total_matches=len(results),
            extracted_filters=extracted_dict,
            results=results,
            inference_time_ms=elapsed_ms,
        )

    async def search_image(
        self,
        upload_file: UploadFile,
        limit: int = 12,
        manual_filters: Optional[Dict[str, Any]] = None,
    ) -> UniversalSearchResponse:
        """
        Executes image-based visual similarity search using Marqo FashionCLIP.
        """
        start_time = time.time()
        file_bytes, img_meta = await self._validate_upload(upload_file)
        cat_filter = (manual_filters or {}).get("category")

        use_embedded = getattr(settings, "ML_SERVICE_URL", "").lower() in ("local", "internal", "embedded")
        candidate_items = []

        if use_embedded or not self.ml_client:
            raw_results = await run_in_threadpool(
                faiss_engine.search_by_image_bytes,
                image_bytes=file_bytes,
                limit=max(limit * 3, 30),
                category_filter=cat_filter,
            )
            candidate_items = raw_results
        else:
            try:
                ml_res = await run_in_threadpool(
                    self.ml_client.search_by_image,
                    image_bytes=file_bytes,
                    filename=upload_file.filename or "query.jpg",
                    content_type=img_meta.content_type,
                    limit=max(limit * 3, 30),
                    category_filter=cat_filter,
                )
                candidate_items = [
                    {
                        "product_id": item.product_id,
                        "score": item.score,
                        "similarity_explanation": item.similarity_explanation,
                    }
                    for item in ml_res.results
                ]
            except Exception as exc:
                logger.warning(f"ML service call failed ({exc}); falling back to local FAISS engine.")
                raw_results = await run_in_threadpool(
                    faiss_engine.search_by_image_bytes,
                    image_bytes=file_bytes,
                    limit=max(limit * 3, 30),
                    category_filter=cat_filter,
                )
                candidate_items = raw_results

        candidate_ids = [c["product_id"] for c in candidate_items]
        db_products = self.repo.get_by_ids(candidate_ids)
        product_map = {p.id: p for p in db_products}

        ordered_products = [product_map[cid] for cid in candidate_ids if cid in product_map]
        dummy_extracted = ExtractedFashionQuery(raw_query="", query_text="")
        filtered_products = self._apply_metadata_filters(ordered_products, dummy_extracted, manual_filters)
        final_products = filtered_products if filtered_products else ordered_products

        # In Fashion Search, prioritize fashion catalog products over legacy items
        fashion_cats = {"clothing", "footwear", "accessories", "watches"}
        fashion_first = [p for p in final_products if (p.category or "").lower() in fashion_cats]
        other_products = [p for p in final_products if (p.category or "").lower() not in fashion_cats]
        final_products = (fashion_first + other_products) if fashion_first else final_products

        scores_map = {c["product_id"]: c for c in candidate_items}
        results: List[VisualSearchResultItem] = []

        for rank, prod in enumerate(final_products[:limit], start=1):
            c_info = scores_map.get(prod.id, {})
            score = round(float(c_info.get("score", 0.85)), 4)
            explanation = c_info.get("similarity_explanation") or f"Visually cohesive design with {prod.name}"
            results.append(
                VisualSearchResultItem(
                    rank=rank,
                    similarity_score=score,
                    product=ProductRead.model_validate(prod),
                    similarity_explanation=explanation,
                )
            )

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        return UniversalSearchResponse(
            query=None,
            mode="image",
            total_matches=len(results),
            extracted_filters=manual_filters,
            results=results,
            query_image=img_meta,
            inference_time_ms=elapsed_ms,
        )

    async def search_hybrid(
        self,
        upload_file: UploadFile,
        query: str,
        image_weight: float = 0.7,
        text_weight: float = 0.3,
        limit: int = 12,
        manual_filters: Optional[Dict[str, Any]] = None,
    ) -> UniversalSearchResponse:
        """
        Executes hybrid multimodal search combining FashionCLIP image embedding and text query.
        """
        start_time = time.time()
        file_bytes, img_meta = await self._validate_upload(upload_file)
        extracted = query_understanding_service.parse_query(query)
        cat_filter = (manual_filters or {}).get("category") or extracted.category

        use_embedded = getattr(settings, "ML_SERVICE_URL", "").lower() in ("local", "internal", "embedded")
        candidate_items = []

        if use_embedded or not self.ml_client:
            raw_results = await run_in_threadpool(
                faiss_engine.search_hybrid,
                image_bytes=file_bytes,
                query_text=extracted.query_text or extracted.raw_query,
                image_weight=image_weight,
                text_weight=text_weight,
                limit=max(limit * 3, 30),
                category_filter=cat_filter,
            )
            candidate_items = raw_results
        else:
            try:
                ml_res = await run_in_threadpool(
                    self.ml_client.search_hybrid,
                    image_bytes=file_bytes,
                    query=extracted.query_text or extracted.raw_query,
                    image_weight=image_weight,
                    text_weight=text_weight,
                    filename=upload_file.filename or "query.jpg",
                    content_type=img_meta.content_type,
                    limit=max(limit * 3, 30),
                    category_filter=cat_filter,
                )
                candidate_items = [
                    {
                        "product_id": item.product_id,
                        "score": item.score,
                        "similarity_explanation": item.similarity_explanation,
                    }
                    for item in ml_res.results
                ]
            except Exception as exc:
                logger.warning(f"ML service hybrid call failed ({exc}); falling back to local FAISS engine.")
                raw_results = await run_in_threadpool(
                    faiss_engine.search_hybrid,
                    image_bytes=file_bytes,
                    query_text=extracted.query_text or extracted.raw_query,
                    image_weight=image_weight,
                    text_weight=text_weight,
                    limit=max(limit * 3, 30),
                    category_filter=cat_filter,
                )
                candidate_items = raw_results

        candidate_ids = [c["product_id"] for c in candidate_items]
        db_products = self.repo.get_by_ids(candidate_ids)
        product_map = {p.id: p for p in db_products}

        ordered_products = [product_map[cid] for cid in candidate_ids if cid in product_map]
        filtered_products = self._apply_metadata_filters(ordered_products, extracted, manual_filters)
        final_products = filtered_products if filtered_products else ordered_products

        # In Fashion Search, prioritize fashion catalog products over legacy items
        fashion_cats = {"clothing", "footwear", "accessories", "watches"}
        fashion_first = [p for p in final_products if (p.category or "").lower() in fashion_cats]
        other_products = [p for p in final_products if (p.category or "").lower() not in fashion_cats]
        final_products = (fashion_first + other_products) if fashion_first else final_products

        scores_map = {c["product_id"]: c for c in candidate_items}
        results: List[VisualSearchResultItem] = []

        for rank, prod in enumerate(final_products[:limit], start=1):
            c_info = scores_map.get(prod.id, {})
            score = round(float(c_info.get("score", 0.85)), 4)
            explanation = c_info.get("similarity_explanation") or (
                f"Hybrid visual & semantic match ({int(image_weight*100)}% visual, {int(text_weight*100)}% text)"
            )
            results.append(
                VisualSearchResultItem(
                    rank=rank,
                    similarity_score=score,
                    product=ProductRead.model_validate(prod),
                    similarity_explanation=explanation,
                )
            )

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        extracted_dict = extracted.model_dump(exclude_none=True)

        return UniversalSearchResponse(
            query=query,
            mode="hybrid",
            total_matches=len(results),
            extracted_filters=extracted_dict,
            results=results,
            query_image=img_meta,
            inference_time_ms=elapsed_ms,
        )

    async def _validate_upload(self, upload_file: UploadFile) -> Tuple[bytes, QueryImageMetadata]:
        content_type = (upload_file.content_type or "application/octet-stream").lower()
        if content_type not in settings.allowed_mime_types_list:
            raise InvalidImageError(
                f"Unsupported image type '{content_type}'. Allowed types: {', '.join(settings.allowed_mime_types_list)}",
                error_code="UNSUPPORTED_MEDIA_TYPE",
            )

        file_bytes = await upload_file.read()
        file_size = len(file_bytes)
        if file_size == 0:
            raise InvalidImageError("Uploaded file is empty.", error_code="EMPTY_FILE")
        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
            raise InvalidImageError(
                f"File size {file_size} exceeds limit of {max_mb:.1f}MB.",
                error_code="FILE_TOO_LARGE",
            )

        try:
            stream = io.BytesIO(file_bytes)
            with Image.open(stream) as img:
                img_format = img.format
                width, height = img.size
                img.verify()
        except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
            raise InvalidImageError("Uploaded file is corrupt or unreadable.", error_code="CORRUPT_IMAGE")

        meta = QueryImageMetadata(
            filename=upload_file.filename,
            content_type=content_type,
            size_bytes=file_size,
            width=width,
            height=height,
            format=img_format,
        )
        return file_bytes, meta
