"""
End-to-end integration tests for OpenAI CLIP and FAISS visual search pipeline.
Tests FastAPI routes, ML microservice contract, error validations, and catalog enrichment.
"""
import io
import pytest
from PIL import Image
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from mock_ml_service import app as ml_app
from backend.app.main import app as backend_app
from backend.app.schemas.ml_contract import MLSearchResponse, MLSearchItemResult
from backend.app.services.build_index import fetch_image_safely


@pytest.fixture
def ml_client():
    with TestClient(ml_app) as client:
        yield client


@pytest.fixture
def valid_query_image():
    img = Image.new("RGB", (224, 224), color=(60, 120, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_ml_service_health(ml_client):
    response = ml_client.get("/internal/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "Marqo/marqo-fashionCLIP" in data["model"]
    assert data["index_size"] > 0
    assert data["index_ready"] is True


def test_ml_service_search_endpoint(ml_client, valid_query_image):
    files = {"file": ("query.jpg", valid_query_image, "image/jpeg")}
    data = {"limit": "5"}
    response = ml_client.post("/internal/search", files=files, data=data)

    assert response.status_code == 200
    res_data = response.json()
    assert "results" in res_data
    assert len(res_data["results"]) <= 5
    assert len(res_data["results"]) > 0
    assert "Marqo/marqo-fashionCLIP" in res_data["model_version"]

    first_item = res_data["results"][0]
    assert "product_id" in first_item
    assert "score" in first_item
    assert 0.0 <= first_item["score"] <= 1.0


def test_ml_service_more_like_this_endpoint(ml_client):
    product_id = "prod_apple_iphone_15_pro"
    response = ml_client.get(f"/internal/more-like-this/{product_id}?limit=4")

    assert response.status_code == 200
    res_data = response.json()
    assert len(res_data["results"]) <= 4
    # Queried product should be excluded
    returned_ids = [r["product_id"] for r in res_data["results"]]
    assert product_id not in returned_ids


def test_ml_service_corrupt_upload_rejected(ml_client):
    files = {"file": ("corrupt.jpg", b"garbage-bytes-not-an-image", "image/jpeg")}
    response = ml_client.post("/internal/search", files=files)
    assert response.status_code == 400
    assert "corrupt" in response.json()["detail"].lower()


def test_ml_service_oversized_upload_rejected(ml_client):
    oversized_bytes = b"X" * (11 * 1024 * 1024)  # 11MB
    files = {"file": ("huge.jpg", oversized_bytes, "image/jpeg")}
    response = ml_client.post("/internal/search", files=files)
    assert response.status_code == 400
    assert "exceeds" in response.json()["detail"].lower()


def test_backend_visual_search_full_pipeline(client, valid_query_image):
    """
    Tests backend /api/visual-search with an ML response, verifying that ranking
    order is preserved and results are enriched from the database.
    """
    mock_ml_response = MLSearchResponse(
        results=[
            MLSearchItemResult(
                product_id="prod_apple_iphone_15_pro",
                score=0.9412,
                similarity_explanation="High silhouette match",
            ),
            MLSearchItemResult(
                product_id="prod_samsung_galaxy_s24_ultra",
                score=0.8876,
                similarity_explanation="Matching titanium frame",
            ),
        ],
        model_version="openai/clip-vit-base-patch32:v2.0.0",
        inference_time_ms=28.5,
    )

    with patch("backend.app.services.ml_client.MLServiceClient.search_by_image", return_value=mock_ml_response):
        files = {"file": ("query.jpg", valid_query_image, "image/jpeg")}
        response = client.post("/api/visual-search?limit=5", files=files)

        assert response.status_code == 200
        data = response.json()
        assert data["total_matches"] == 2
        results = data["results"]
        assert len(results) == 2

        # Check preserved ranking
        assert results[0]["rank"] == 1
        assert results[0]["product"]["id"] == "prod_apple_iphone_15_pro"
        assert results[0]["similarity_score"] == 0.9412

        assert results[1]["rank"] == 2
        assert results[1]["product"]["id"] == "prod_samsung_galaxy_s24_ultra"
        assert results[1]["similarity_score"] == 0.8876


def test_backend_more_like_this_endpoint(client):
    product_id = "prod_apple_iphone_15_pro"
    response = client.get(f"/api/visual-search/more-like-this/{product_id}?limit=4")

    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) <= 4
    for item in data["results"]:
        assert item["product"]["id"] != product_id
        assert 0.0 <= item["similarity_score"] <= 1.0


def test_backend_more_like_this_nonexistent_product(client):
    response = client.get("/api/visual-search/more-like-this/nonexistent_prod_99999")
    assert response.status_code == 404
    assert response.json()["error_code"] == "PRODUCT_NOT_FOUND"


def test_fetch_image_safely_broken_url():
    # Invalid schema or non-existent URL should return None cleanly without crashing
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    mock_client.get.return_value = mock_resp

    result = fetch_image_safely("https://example.com/nonexistent.jpg", mock_client)
    assert result is None


def test_fetch_image_safely_invalid_schema():
    mock_client = MagicMock()
    assert fetch_image_safely("ftp://invalid.com/pic.jpg", mock_client) is None
    assert fetch_image_safely("", mock_client) is None
