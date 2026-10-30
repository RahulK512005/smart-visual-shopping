"""
Comprehensive unit and integration tests for FashionCLIP + FAISS Vector Search Engine.
Covers:
1. Model initialization
2. Image embedding generation
3. Embedding dimension validation
4. L2 normalization
5. FAISS index creation
6. Saving and loading the new index
7. Correct mapping from FAISS results to product IDs
8. Visual search response compatibility
9. Invalid image handling
10. Empty catalog handling
11. Missing product image handling
12. Model unavailable / inference failure handling
13. Incremental product indexing
"""
import io
import json
import numpy as np
import pytest
from pathlib import Path
from PIL import Image
import faiss
from unittest.mock import patch

from backend.app.services.clip_service import ClipEmbeddingService, get_clip_service, EMBEDDING_DIM
from backend.app.services.faiss_engine import FaissVisualSearchEngine, faiss_engine


@pytest.fixture
def test_clip():
    service = get_clip_service()
    service.load_model()
    return service


def test_1_fashionclip_initialization(test_clip):
    """1. FashionCLIP model initialization."""
    assert test_clip.is_ready is True
    assert "Marqo/marqo-fashionCLIP" in test_clip.model_id
    assert test_clip.model is not None
    assert test_clip.preprocess is not None


def test_2_valid_image_embedding_generation(test_clip):
    """2. Valid image embedding generation."""
    img = Image.new("RGB", (224, 224), color=(180, 50, 70))
    emb = test_clip.extract_image_embedding(img)
    assert isinstance(emb, np.ndarray)
    assert emb.dtype == np.float32


def test_3_embedding_dimension_validation(test_clip):
    """3. Embedding dimension validation."""
    assert test_clip.embedding_dim == 512
    img = Image.new("RGB", (100, 100), color=(0, 200, 100))
    emb = test_clip.extract_image_embedding(img)
    assert emb.shape == (512,)


def test_4_l2_normalization(test_clip):
    """4. L2 normalization."""
    img = Image.new("RGB", (100, 100), color=(50, 100, 200))
    emb = test_clip.extract_image_embedding(img)
    norm = float(np.linalg.norm(emb))
    assert pytest.approx(norm, abs=1e-5) == 1.0


def test_5_and_6_faiss_index_creation_save_load(tmp_path, test_clip):
    """5 & 6. FAISS index creation, saving and loading."""
    index_file = tmp_path / "fashionclip_test.index"
    meta_file = tmp_path / "fashionclip_test.json"

    idx = faiss.IndexFlatIP(EMBEDDING_DIM)
    vecs = np.random.randn(4, EMBEDDING_DIM).astype(np.float32)
    faiss.normalize_L2(vecs)
    idx.add(vecs)

    meta = {
        "version": "3.0.0",
        "model_id": test_clip.model_id,
        "dimension": EMBEDDING_DIM,
        "total_vectors": 4,
        "unique_products": 2,
        "index_entries": [
            {"index": 0, "product_id": "item_1", "image_url": "img1.jpg"},
            {"index": 1, "product_id": "item_1", "image_url": "img1_side.jpg"},
            {"index": 2, "product_id": "item_2", "image_url": "img2.jpg"},
            {"index": 3, "product_id": "item_2", "image_url": "img2_back.jpg"},
        ],
        "product_catalog": {
            "item_1": {"id": "item_1", "name": "Classic Oxford Shirt", "category": "shirt", "brand": "Ralph"},
            "item_2": {"id": "item_2", "name": "Slim Chino Trousers", "category": "trouser", "brand": "Bonobos"},
        },
    }

    faiss.write_index(idx, str(index_file))
    with open(meta_file, "w") as f:
        json.dump(meta, f)

    engine = FaissVisualSearchEngine(index_file=index_file, meta_file=meta_file)
    assert engine.is_ready is True
    assert engine.index.ntotal == 4
    assert len(engine.product_catalog) == 2


def test_7_correct_mapping_product_ids(tmp_path):
    """7. Correct mapping from FAISS results to product IDs without duplicates."""
    index_file = tmp_path / "test_map.index"
    meta_file = tmp_path / "test_map.json"

    idx = faiss.IndexFlatIP(EMBEDDING_DIM)
    # v0 and v1 belong to item_1, v2 belongs to item_2
    v0 = np.array([1.0] + [0.0] * (EMBEDDING_DIM - 1), dtype=np.float32)
    v1 = np.array([0.9] + [0.1] * (EMBEDDING_DIM - 1), dtype=np.float32)
    v2 = np.array([0.1] * EMBEDDING_DIM, dtype=np.float32)
    vecs = np.vstack([v0, v1, v2])
    faiss.normalize_L2(vecs)
    idx.add(vecs)

    meta = {
        "version": "3.0.0",
        "model_id": "hf-hub:Marqo/marqo-fashionCLIP",
        "dimension": EMBEDDING_DIM,
        "total_vectors": 3,
        "unique_products": 2,
        "index_entries": [
            {"index": 0, "product_id": "item_1", "image_url": "img1.jpg"},
            {"index": 1, "product_id": "item_1", "image_url": "img2.jpg"},
            {"index": 2, "product_id": "item_2", "image_url": "img3.jpg"},
        ],
        "product_catalog": {
            "item_1": {"id": "item_1", "name": "Black Leather Boots", "category": "boots"},
            "item_2": {"id": "item_2", "name": "Canvas Sneakers", "category": "sneakers"},
        },
    }

    faiss.write_index(idx, str(index_file))
    with open(meta_file, "w") as f:
        json.dump(meta, f)

    engine = FaissVisualSearchEngine(index_file=index_file, meta_file=meta_file)
    results = engine.search_by_vector(v0, limit=5)

    assert len(results) == 2
    # Ensure item_1 is ranked first with best score
    assert results[0]["product_id"] == "item_1"
    assert results[0]["score"] > results[1]["score"]
    # Ensure no duplicates
    assert len(set(r["product_id"] for r in results)) == 2


def test_8_visual_search_response_compatibility():
    """8. Visual search API response structure compatibility."""
    assert faiss_engine.is_ready is True
    img = Image.new("RGB", (100, 100), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    results = faiss_engine.search_by_image_bytes(buf.getvalue(), limit=3)
    assert isinstance(results, list)
    for r in results:
        assert "product_id" in r
        assert "score" in r
        assert "detection_label" in r
        assert "similarity_explanation" in r
        assert 0.0 <= r["score"] <= 1.0


def test_9_invalid_image_handling(test_clip):
    """9. Invalid image handling."""
    with pytest.raises(ValueError):
        test_clip.extract_image_embedding(b"not-a-valid-image")


def test_10_empty_catalog_handling(tmp_path):
    """10. Empty catalog handling returns empty list gracefully."""
    index_file = tmp_path / "empty.index"
    meta_file = tmp_path / "empty.json"

    idx = faiss.IndexFlatIP(EMBEDDING_DIM)
    faiss.write_index(idx, str(index_file))
    with open(meta_file, "w") as f:
        json.dump({"dimension": EMBEDDING_DIM, "index_entries": [], "product_catalog": {}}, f)

    engine = FaissVisualSearchEngine(index_file=index_file, meta_file=meta_file)
    results = engine.search_by_vector(np.zeros(EMBEDDING_DIM, dtype=np.float32))
    assert results == []


def test_11_missing_product_image_fallback(test_clip):
    """11. Missing product image generates text fallback vector in same latent space."""
    desc = "Nike Air Max running sneakers in white"
    text_vec = test_clip.extract_text_embedding(desc)
    assert text_vec.shape == (EMBEDDING_DIM,)
    assert pytest.approx(float(np.linalg.norm(text_vec)), abs=1e-5) == 1.0


def test_12_model_unavailable_handling():
    """12. Model unavailable or failure handling."""
    service = ClipEmbeddingService(model_id="invalid/model/path/xyz")
    with pytest.raises(RuntimeError):
        service.load_model()


def test_13_incremental_product_indexing(tmp_path, test_clip):
    """13. Incremental indexing adds vector and updates live FAISS mappings."""
    index_file = tmp_path / "incremental.index"
    meta_file = tmp_path / "incremental.json"

    idx = faiss.IndexFlatIP(EMBEDDING_DIM)
    vec = np.random.randn(1, EMBEDDING_DIM).astype(np.float32)
    faiss.normalize_L2(vec)
    idx.add(vec)

    meta = {
        "version": "3.0.0",
        "model_id": test_clip.model_id,
        "dimension": EMBEDDING_DIM,
        "total_vectors": 1,
        "unique_products": 1,
        "index_entries": [{"index": 0, "product_id": "prod_0", "image_url": "url0"}],
        "product_catalog": {"prod_0": {"id": "prod_0", "name": "Initial Item"}},
    }
    faiss.write_index(idx, str(index_file))
    with open(meta_file, "w") as f:
        json.dump(meta, f)

    engine = FaissVisualSearchEngine(index_file=index_file, meta_file=meta_file)
    assert engine.index.ntotal == 1

    new_prod = {"id": "prod_new", "name": "Floral Summer Dress", "category": "dress"}
    new_img = Image.new("RGB", (100, 100), color=(255, 100, 100))

    new_idx = engine.add_product(new_prod, new_img, image_url="http://example.com/dress.jpg")
    assert new_idx == 1
    assert engine.index.ntotal == 2
    assert "prod_new" in engine.product_catalog
    assert "prod_new" in engine.product_to_indices

