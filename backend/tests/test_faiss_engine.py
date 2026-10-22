"""
Unit and functional tests for the FAISS Vector Search Engine.
Tests cosine similarity search, multi-image aggregation, metadata validation, and persistence.
"""
import io
import json
import numpy as np
import pytest
from pathlib import Path
from PIL import Image
import faiss

from backend.app.services.faiss_engine import FaissVisualSearchEngine, faiss_engine
from backend.app.services.clip_service import EMBEDDING_DIM


def test_faiss_engine_singleton_ready():
    assert faiss_engine.is_ready is True
    assert faiss_engine.index is not None
    assert faiss_engine.index.ntotal > 0
    assert faiss_engine.index.d == EMBEDDING_DIM
    assert len(faiss_engine.product_catalog) > 0


def test_faiss_search_by_image_bytes():
    img = Image.new("RGB", (120, 120), color=(100, 120, 140))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    results = faiss_engine.search_by_image_bytes(buf.getvalue(), limit=5)
    assert isinstance(results, list)
    assert len(results) <= 5
    assert len(results) > 0

    prev_score = 1.0
    for r in results:
        assert "product_id" in r
        assert "score" in r
        assert "similarity_explanation" in r
        assert 0.0 <= r["score"] <= 1.0
        # Check sorted descending
        assert r["score"] <= prev_score + 1e-4
        prev_score = r["score"]


def test_faiss_multi_image_score_aggregation(tmp_path):
    """
    Verifies that when a product has multiple images in FAISS, search aggregates
    the best score per product ID and returns no duplicate product cards.
    """
    index_file = tmp_path / "test_multi.index"
    meta_file = tmp_path / "test_multi.json"

    # Create 3 vectors:
    # Vector 0: product_A (primary image)
    # Vector 1: product_A (additional image)
    # Vector 2: product_B (primary image)
    v0 = np.array([1.0] + [0.0] * (EMBEDDING_DIM - 1), dtype=np.float32)
    v1 = np.array([0.0, 1.0] + [0.0] * (EMBEDDING_DIM - 2), dtype=np.float32)
    v2 = np.array([0.5, 0.5] + [0.0] * (EMBEDDING_DIM - 2), dtype=np.float32)
    v2 = v2 / np.linalg.norm(v2)

    vecs = np.vstack([v0, v1, v2]).astype(np.float32)
    idx = faiss.IndexFlatIP(EMBEDDING_DIM)
    idx.add(vecs)
    faiss.write_index(idx, str(index_file))

    meta = {
        "version": "2.0.0",
        "model_id": "test-clip",
        "dimension": EMBEDDING_DIM,
        "total_vectors": 3,
        "unique_products": 2,
        "index_entries": [
            {"index": 0, "product_id": "prod_A", "image_url": "url_A1", "image_type": "primary"},
            {"index": 1, "product_id": "prod_A", "image_url": "url_A2", "image_type": "additional"},
            {"index": 2, "product_id": "prod_B", "image_url": "url_B1", "image_type": "primary"},
        ],
        "product_catalog": {
            "prod_A": {"id": "prod_A", "name": "Product A", "category": "smartphone", "brand": "BrandA"},
            "prod_B": {"id": "prod_B", "name": "Product B", "category": "smartphone", "brand": "BrandB"},
        },
    }
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(meta, f)

    engine = FaissVisualSearchEngine(index_file=index_file, meta_file=meta_file)
    assert engine.is_ready is True

    # Query with vector close to v1 (product_A's second image)
    # Cosine sim with v0: 0.1, with v1: 0.99, with v2: ~0.70
    query = np.array([0.1, 0.99] + [0.0] * (EMBEDDING_DIM - 2), dtype=np.float32)
    query /= np.linalg.norm(query)

    results = engine.search_by_vector(query, limit=5)

    # Must contain 2 results (prod_A and prod_B), no duplicates!
    product_ids = [r["product_id"] for r in results]
    assert len(product_ids) == len(set(product_ids)) == 2

    # prod_A should be rank 1 with score near 0.99 (not the 0.1 of image 1)
    assert results[0]["product_id"] == "prod_A"
    assert results[0]["score"] > 0.90
    assert results[1]["product_id"] == "prod_B"


def test_faiss_more_like_this_excludes_self():
    product_id = "prod_apple_iphone_15_pro"
    results = faiss_engine.search_more_like_this(product_id=product_id, limit=4)

    assert len(results) > 0
    returned_ids = [r["product_id"] for r in results]
    assert product_id not in returned_ids


def test_faiss_category_filtering():
    img = Image.new("RGB", (100, 100), color=(10, 20, 30))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    results = faiss_engine.search_by_image_bytes(buf.getvalue(), limit=5, category_filter="laptop")
    assert len(results) > 0
    for r in results:
        p_info = faiss_engine.product_catalog.get(r["product_id"], {})
        assert p_info.get("category", "").lower() == "laptop"


def test_faiss_missing_index_graceful_handling(tmp_path):
    empty_index = tmp_path / "non_existent.index"
    empty_meta = tmp_path / "non_existent.json"

    # Verify that an unready engine gracefully returns empty results without crashing
    engine = FaissVisualSearchEngine.__new__(FaissVisualSearchEngine)
    engine.index_file = empty_index
    engine.meta_file = empty_meta
    engine.index = None
    engine.metadata = {}
    engine._is_loaded = False
    engine.product_catalog = {}
    engine.product_to_indices = {}
    engine.index_entries = []

    assert engine.is_ready is False
    dummy_query = np.zeros(EMBEDDING_DIM, dtype=np.float32)
    results = engine.search_by_vector(dummy_query, limit=5)
    assert results == []

    mlt = engine.search_more_like_this("prod_any", limit=5)
    assert mlt == []


def test_index_persistence_and_reload(tmp_path):
    # Save a copy of current index and meta to temp directory
    test_idx_path = tmp_path / "copy.index"
    test_meta_path = tmp_path / "copy.json"

    faiss.write_index(faiss_engine.index, str(test_idx_path))
    with open(test_meta_path, "w", encoding="utf-8") as f:
        json.dump(faiss_engine.metadata, f)

    reloaded_engine = FaissVisualSearchEngine(index_file=test_idx_path, meta_file=test_meta_path)
    assert reloaded_engine.is_ready is True
    assert reloaded_engine.index.ntotal == faiss_engine.index.ntotal
    assert reloaded_engine.product_ids == faiss_engine.product_ids
