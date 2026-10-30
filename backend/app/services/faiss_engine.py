"""
FAISS Vector Search Engine for Smart Visual Shopping with Marqo FashionCLIP.
Manages FAISS CPU IndexFlatIP (Cosine Similarity) over FashionCLIP
embeddings for catalog products.
Provides:
1. Embedding extraction and FAISS similarity search for query images.
2. Best-score aggregation across multiple images per product.
3. Category, brand, and metadata-aware filtering and ranking.
4. 'More like this' search by existing product ID.
5. Persistent metadata validation and consistency checking.
6. Incremental indexing for single or batch product additions.
"""
import io
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set, Union

import faiss
import numpy as np
from PIL import Image

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.clip_service import EMBEDDING_DIM, get_clip_service

SERVICE_DIR = Path(__file__).resolve().parent
DEFAULT_INDEX_PATH = SERVICE_DIR / "fashionclip_fashion.index"
DEFAULT_META_PATH = SERVICE_DIR / "fashionclip_fashion_meta.json"


class FaissVisualSearchEngine:
    """High-performance CPU vector search engine using FAISS IndexFlatIP and Marqo FashionCLIP."""

    def __init__(
        self,
        index_file: Optional[Path] = None,
        meta_file: Optional[Path] = None,
    ):
        self.index_file = Path(index_file or settings.VECTOR_INDEX_PATH)
        if not self.index_file.is_absolute():
            self.index_file = SERVICE_DIR.parent.parent.parent / self.index_file

        self.meta_file = Path(meta_file or settings.VECTOR_METADATA_PATH)
        if not self.meta_file.is_absolute():
            self.meta_file = SERVICE_DIR.parent.parent.parent / self.meta_file

        self.index: Optional[faiss.IndexFlatIP] = None
        self.metadata: dict = {}
        self.index_entries: List[dict] = []
        self.product_catalog: Dict[str, dict] = {}
        self.product_to_indices: Dict[str, List[int]] = {}
        self.product_ids: List[str] = []
        self._is_loaded = False

        self.load_index()

    def load_index(self) -> bool:
        """Loads FAISS index and metadata from disk, verifying consistency."""
        if not self.index_file.exists() or not self.meta_file.exists():
            logger.warning(
                f"FashionCLIP vector index or metadata not found at {self.index_file}. Attempting to build automatically..."
            )
            try:
                from backend.app.services.build_index import build_faiss_index
                self.index, self.metadata = build_faiss_index(
                    index_path=self.index_file,
                    meta_path=self.meta_file,
                )
                self._populate_mappings()
                self._is_loaded = True
                return True
            except Exception as exc:
                logger.error(f"Failed to auto-build vector index: {exc}")
                self._is_loaded = False
                return False

        try:
            # Read index
            index = faiss.read_index(str(self.index_file))
            with open(self.meta_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)

            # Metadata integrity checks
            model_id = metadata.get("model_id")
            dimension = metadata.get("dimension", EMBEDDING_DIM)
            entries = metadata.get("index_entries", [])

            clip_service = get_clip_service()
            expected_dim = getattr(clip_service, "embedding_dim", EMBEDDING_DIM)

            if dimension != expected_dim or dimension != index.d:
                logger.error(
                    f"Vector dimension mismatch: index has {index.d}, metadata has {dimension}, expected {expected_dim}."
                )
                return False

            if len(entries) != index.ntotal:
                logger.error(
                    f"Index entry count mismatch: FAISS has {index.ntotal} vectors, metadata has {len(entries)} entries."
                )
                return False

            self.index = index
            self.metadata = metadata
            self._populate_mappings()
            self._is_loaded = True
            logger.info(
                f"FashionCLIP FAISS index loaded: {self.index.ntotal} vectors for {len(self.product_catalog)} products (model={model_id})."
            )
            return True
        except Exception as exc:
            logger.error(f"Error loading FAISS index or metadata: {exc}")
            self._is_loaded = False
            return False

    def _populate_mappings(self) -> None:
        """Builds lookup structures from loaded metadata."""
        self.index_entries = self.metadata.get("index_entries", [])
        self.product_catalog = self.metadata.get("product_catalog", {})

        self.product_to_indices = {}
        for entry in self.index_entries:
            idx = entry["index"]
            pid = entry["product_id"]
            if pid not in self.product_to_indices:
                self.product_to_indices[pid] = []
            self.product_to_indices[pid].append(idx)

        self.product_ids = list(self.product_catalog.keys())

    @property
    def is_ready(self) -> bool:
        return self._is_loaded and self.index is not None and self.index.ntotal > 0

    def add_product(
        self,
        product: dict,
        image_or_vector: Union[np.ndarray, bytes, Image.Image],
        image_url: str = "",
    ) -> int:
        """
        Incrementally indexes a single product into the live FAISS index and persists changes.
        Returns the assigned FAISS vector index.
        """
        clip_service = get_clip_service()
        if isinstance(image_or_vector, np.ndarray):
            vec = image_or_vector.astype(np.float32).flatten()
        else:
            vec = clip_service.extract_image_embedding(image_or_vector)

        # Normalize vector
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        vec = vec.reshape(1, -1).astype(np.float32)

        if self.index is None:
            self.index = faiss.IndexFlatIP(clip_service.embedding_dim)

        assigned_idx = self.index.ntotal
        self.index.add(vec)

        pid = product["id"]
        self.product_catalog[pid] = product
        entry = {
            "index": assigned_idx,
            "product_id": pid,
            "image_url": image_url or product.get("image_url", ""),
            "image_type": "incremental",
        }
        self.index_entries.append(entry)
        if pid not in self.product_to_indices:
            self.product_to_indices[pid] = []
        self.product_to_indices[pid].append(assigned_idx)
        if pid not in self.product_ids:
            self.product_ids.append(pid)

        # Persist updated index and metadata
        try:
            self.metadata["total_vectors"] = self.index.ntotal
            self.metadata["unique_products"] = len(self.product_catalog)
            self.metadata["index_entries"] = self.index_entries
            self.metadata["product_catalog"] = self.product_catalog

            faiss.write_index(self.index, str(self.index_file))
            with open(self.meta_file, "w", encoding="utf-8") as f:
                json.dump(self.metadata, f, indent=2)
            logger.info(f"Incrementally added product '{pid}' at vector index {assigned_idx}.")
        except Exception as exc:
            logger.error(f"Failed to persist incremental index update: {exc}")

        return assigned_idx

    def search_by_image_bytes(
        self,
        image_bytes: bytes,
        limit: int = 10,
        category_filter: Optional[str] = None,
    ) -> List[dict]:
        """
        Extracts FashionCLIP embedding for uploaded query image bytes and searches the FAISS index.
        Aggregates multiple images belonging to the same product by taking the maximum score.
        """
        if not self.is_ready:
            if not self.load_index() or not self.is_ready:
                logger.warning("FAISS index is not ready or empty. Returning empty search results.")
                return []

        clip_service = get_clip_service()
        try:
            query_vec = clip_service.extract_image_embedding(image_bytes)
        except Exception as exc:
            logger.error(f"FashionCLIP embedding extraction failed: {exc}")
            raise ValueError(f"Failed to extract visual embedding from query image: {exc}") from exc

        return self.search_by_vector(query_vec, limit=limit, category_filter=category_filter)

    def search_by_text(
        self,
        query_text: str,
        limit: int = 10,
        category_filter: Optional[str] = None,
    ) -> List[dict]:
        """
        Extracts FashionCLIP embedding for natural language text query and searches FAISS index.
        """
        if not self.is_ready:
            if not self.load_index() or not self.is_ready:
                logger.warning("FAISS index is not ready or empty. Returning empty search results.")
                return []

        clean_text = (query_text or "").strip()
        if not clean_text:
            return []

        clip_service = get_clip_service()
        try:
            query_vec = clip_service.extract_text_embedding(clean_text)
        except Exception as exc:
            logger.error(f"FashionCLIP text embedding extraction failed: {exc}")
            raise ValueError(f"Failed to extract text embedding from query: {exc}") from exc

        return self.search_by_vector(query_vec, limit=limit, category_filter=category_filter)

    def search_hybrid(
        self,
        image_bytes: bytes,
        query_text: str,
        image_weight: float = 0.7,
        text_weight: float = 0.3,
        limit: int = 10,
        category_filter: Optional[str] = None,
    ) -> List[dict]:
        """
        Multimodal hybrid search combining FashionCLIP image embedding and text embedding
        with configurable weighted strategy.
        """
        if not self.is_ready:
            if not self.load_index() or not self.is_ready:
                return []

        clip_service = get_clip_service()
        img_vec = clip_service.extract_image_embedding(image_bytes)
        img_norm = np.linalg.norm(img_vec)
        if img_norm > 0:
            img_vec = img_vec / img_norm

        clean_text = (query_text or "").strip()
        if clean_text:
            txt_vec = clip_service.extract_text_embedding(clean_text)
            txt_norm = np.linalg.norm(txt_vec)
            if txt_norm > 0:
                txt_vec = txt_vec / txt_norm

            combined = (image_weight * img_vec) + (text_weight * txt_vec)
            comb_norm = np.linalg.norm(combined)
            if comb_norm > 0:
                combined = combined / comb_norm
            return self.search_by_vector(combined, limit=limit, category_filter=category_filter)
        else:
            return self.search_by_vector(img_vec, limit=limit, category_filter=category_filter)


    def search_by_vector(
        self,
        query_vec: np.ndarray,
        limit: int = 10,
        category_filter: Optional[str] = None,
    ) -> List[dict]:
        """
        Executes FAISS inner product search using normalized query vector.
        Deduplicates products across multi-image vectors, picking the best matching score.
        """
        if not self.is_ready:
            return []

        query = query_vec.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(query)

        k = min(max(limit * 8, 40), self.index.ntotal)
        scores, indices = self.index.search(query, k)

        best_scores: Dict[str, float] = {}
        product_entries: Dict[str, dict] = {}

        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.index_entries):
                continue
            entry = self.index_entries[idx]
            pid = entry["product_id"]

            p_meta = self.product_catalog.get(pid, {})
            cat = p_meta.get("category", "")

            # Category filter check (supports case-insensitive matching)
            if category_filter and cat.lower() != category_filter.lower():
                continue

            raw_score = float(score)
            if pid not in best_scores or raw_score > best_scores[pid]:
                best_scores[pid] = raw_score
                product_entries[pid] = entry

        sorted_products = sorted(best_scores.items(), key=lambda item: item[1], reverse=True)

        results = []
        for pid, raw_score in sorted_products[:limit]:
            p_meta = self.product_catalog.get(pid, {})
            normalized_score = round(float(np.clip(raw_score, 0.0, 1.0)), 4)
            explanation = self._generate_explanation(p_meta, normalized_score)

            category = p_meta.get("category", "product")
            brand = p_meta.get("brand", "").lower()
            label = f"{category}_{brand}".strip("_")

            results.append({
                "product_id": pid,
                "score": normalized_score,
                "detection_label": label,
                "similarity_explanation": explanation,
            })

        return results

    def search_more_like_this(self, product_id: str, limit: int = 6) -> List[dict]:
        """
        Visual search using indexed vector(s) for a given catalog product.
        Excludes the source product itself from recommendations.
        """
        if not self.is_ready:
            return []

        if product_id not in self.product_to_indices or not self.product_to_indices[product_id]:
            logger.warning(f"Product '{product_id}' not found in vector index.")
            return []

        source_idx = self.product_to_indices[product_id][0]
        source_vec = self.index.reconstruct(source_idx).reshape(1, -1)
        source_p = self.product_catalog.get(product_id, {})

        k = min(limit * 8 + 10, self.index.ntotal)
        scores, indices = self.index.search(source_vec, k)

        best_scores: Dict[str, float] = {}
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.index_entries):
                continue
            entry = self.index_entries[idx]
            cand_id = entry["product_id"]
            if cand_id == product_id:
                continue

            raw_score = float(score)
            if cand_id not in best_scores or raw_score > best_scores[cand_id]:
                best_scores[cand_id] = raw_score

        sorted_candidates = sorted(best_scores.items(), key=lambda item: item[1], reverse=True)

        results = []
        for cand_id, raw_score in sorted_candidates[:limit]:
            cand_p = self.product_catalog.get(cand_id, {})
            normalized_score = round(float(np.clip(raw_score, 0.0, 1.0)), 4)
            explanation = self._generate_more_like_this_explanation(source_p, cand_p, normalized_score)

            category = cand_p.get("category", "product")
            brand = cand_p.get("brand", "").lower()
            label = f"{category}_{brand}".strip("_")

            results.append({
                "product_id": cand_id,
                "score": normalized_score,
                "detection_label": label,
                "similarity_explanation": explanation,
            })

        return results

    def _generate_explanation(self, product: dict, score: float) -> str:
        """Creates a human-readable similarity explanation based on visual attributes and score."""
        category = (product.get("category") or "product").lower()
        score_pct = int(round(score * 100))

        phrases = {
            # Fashion categories
            "clothing": "Matching apparel silhouette, fabric drape, and seam tailoring",
            "shirt": "Consistent collar profile, button placket, and woven fabric texture",
            "t-shirt": "Matching casual crew-neck cut, cotton weave, and sleeve fit",
            "jeans": "Similar denim wash, rivet placement, and trouser silhouette",
            "trouser": "Consistent tailored leg taper, waist pleating, and formal drape",
            "jacket": "Matching outerwear structure, lapel cut, and layered silhouette",
            "dress": "Consistent dress hemline, silhouette contour, and textile texture",
            "skirt": "Matching waistline fit, fabric movement, and skirt profile",
            "ethnic wear": "Consistent traditional garment ornamentation, motif styling, and silhouette",
            "sneakers": "Matching athletic sole profile, upper paneling, and lace geometry",
            "shoes": "Consistent formal shoe leather sheen, toe cap shape, and sole contour",
            "sandals": "Similar open-toe strap architecture and footbed profile",
            "boots": "Matching high-ankle boot shaft, rugged welt, and leather texture",
            "watches": "Similar timepiece bezel geometry, dial typography, and strap finish",
            "smartwatch": "Similar smartwatch case profile, wristband attachment, and crown geometry",
            "bag": "Consistent handbag silhouette, strap hardware, and compartment profile",
            "backpack": "Matching ergonomic harness styling, pocket placement, and fabric finish",
            "wallet": "Similar compact bi-fold geometry, textured leather finish, and edge stitching",
            "sunglasses": "Matching eyewear frame curvature, temple hinge style, and lens tint",
            "jewellery": "Consistent metallic lustre, pendant geometry, and chain weave",
            "accessories": "Matching designer accessory aesthetics, material finish, and accents",
            # Electronics & devices
            "smartphone": "High visual affinity with smartphone silhouette, bezel geometry, and camera housing",
            "laptop": "Matching slim clamshell form factor, keyboard layout, and display chassis",
            "charger": "Matching compact wall-charger profile, matte finish, and port geometry",
            "powerbank": "Similar handheld power bank dimensions, textured surface, and LED indicators",
            "cable": "Consistent braided cable profile, connector form factor, and strain relief",
            "monitor": "Matching widescreen desktop display aspect ratio, slim bezels, and stand style",
            "wearable": "Similar smartwatch case profile, wristband attachment, and crown geometry",
            "case": "Matching protective chassis silhouette, device cutouts, and corner bumpers",
            "audio": "Consistent acoustic ear-cup shape, padded headband, and dark finish",
            "hub": "Matching multi-port adapter footprint, aluminum enclosure, and port layout",
        }
        base_desc = phrases.get(category, f"Visually cohesive {category} design language and form factor")
        return f"{base_desc} (FashionCLIP cosine similarity: {score_pct}%)"

    def _generate_more_like_this_explanation(self, source_p: dict, cand_p: dict, score: float) -> str:
        s_cat = (source_p.get("category") or "").lower()
        c_cat = (cand_p.get("category") or "").lower()
        cand_brand = cand_p.get("brand", "")
        score_pct = int(round(score * 100))

        if s_cat == c_cat and s_cat:
            return f"Matching {s_cat} form factor, design profile, and {cand_brand} aesthetics ({score_pct}% visual match)"
        return f"Visually cohesive styling and materials across {c_cat or 'catalog items'} ({score_pct}% visual match)"


# Singleton engine instance
faiss_engine = FaissVisualSearchEngine()
