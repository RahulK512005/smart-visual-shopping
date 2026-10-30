"""
Unit tests for FashionCLIP Embedding Service (Marqo/marqo-fashionCLIP).
Tests embedding dimensions, L2 normalization, error handling, batch extraction,
and cross-modal text embedding generation.
"""
import io
import numpy as np
import pytest
from PIL import Image
from unittest.mock import patch

from backend.app.services.clip_service import ClipEmbeddingService, get_clip_service, EMBEDDING_DIM


@pytest.fixture
def test_clip_service():
    service = get_clip_service()
    service.load_model()
    return service


def test_clip_singleton_instance():
    s1 = get_clip_service()
    s2 = get_clip_service()
    assert s1 is s2


def test_clip_embedding_dimension_and_normalization(test_clip_service):
    img = Image.new("RGB", (224, 224), color=(120, 80, 200))
    embedding = test_clip_service.extract_image_embedding(img)

    assert isinstance(embedding, np.ndarray)
    assert embedding.shape == (EMBEDDING_DIM,)
    assert embedding.dtype == np.float32

    # L2 norm must be approximately 1.0
    norm = float(np.linalg.norm(embedding))
    assert pytest.approx(norm, abs=1e-5) == 1.0


def test_clip_text_embedding_generation(test_clip_service):
    text = "vintage floral summer dress"
    text_emb = test_clip_service.extract_text_embedding(text)

    assert isinstance(text_emb, np.ndarray)
    assert text_emb.shape == (EMBEDDING_DIM,)
    assert text_emb.dtype == np.float32

    norm = float(np.linalg.norm(text_emb))
    assert pytest.approx(norm, abs=1e-5) == 1.0


def test_clip_extract_from_bytes(test_clip_service):
    img = Image.new("RGB", (100, 100), color=(50, 150, 250))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    image_bytes = buf.getvalue()

    embedding = test_clip_service.extract_image_embedding(image_bytes)
    assert embedding.shape == (EMBEDDING_DIM,)
    norm = float(np.linalg.norm(embedding))
    assert pytest.approx(norm, abs=1e-5) == 1.0


def test_clip_batch_embeddings(test_clip_service):
    img1 = Image.new("RGB", (100, 100), color=(255, 0, 0))
    img2 = Image.new("RGB", (100, 100), color=(0, 255, 0))
    img3 = Image.new("RGB", (100, 100), color=(0, 0, 255))

    embeddings = test_clip_service.extract_batch_embeddings([img1, img2, img3])
    assert embeddings.shape == (3, EMBEDDING_DIM)
    assert embeddings.dtype == np.float32

    for i in range(3):
        norm = float(np.linalg.norm(embeddings[i]))
        assert pytest.approx(norm, abs=1e-5) == 1.0


def test_clip_empty_batch(test_clip_service):
    embeddings = test_clip_service.extract_batch_embeddings([])
    assert embeddings.shape == (0, EMBEDDING_DIM)


def test_clip_invalid_image_bytes_raises_value_error(test_clip_service):
    with pytest.raises(ValueError, match="Corrupted or unsupported"):
        test_clip_service.extract_image_embedding(b"invalid-corrupt-data-stream")


def test_clip_empty_bytes_raises_value_error(test_clip_service):
    with pytest.raises(ValueError):
        test_clip_service.extract_image_embedding(b"")


def test_clip_model_initialization_failure():
    service = ClipEmbeddingService(model_id="non-existent/fake-model-id-12345")
    with pytest.raises(RuntimeError, match="Could not initialize FashionCLIP model"):
        service.load_model()


def test_clip_device_selection_auto():
    service = ClipEmbeddingService(device="auto")
    assert service.device.type in ["cuda", "cpu"]


def test_clip_device_selection_cuda_fallback_when_unavailable():
    with patch("torch.cuda.is_available", return_value=False):
        service = ClipEmbeddingService(device="cuda")
        assert service.device.type == "cpu"
