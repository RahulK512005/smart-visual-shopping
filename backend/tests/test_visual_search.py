from unittest.mock import patch
from backend.app.schemas.ml_contract import MLSearchItemResult, MLSearchResponse
from backend.app.core.errors import MLServiceUnavailableError, MLServiceTimeoutError


def test_visual_search_success_and_rank_preservation(client, sample_valid_jpeg):
    # Mock the external ML service response
    mock_ml_result = MLSearchResponse(
        results=[
            MLSearchItemResult(product_id="prod_apple_iphone_15_pro", score=0.952),
            MLSearchItemResult(product_id="prod_anker_737_charger_120w", score=0.841),
            MLSearchItemResult(product_id="prod_apple_iphone_14", score=0.780),
        ],
        model_version="clip-vit-test",
        inference_time_ms=45.0,
    )

    with patch("backend.app.services.ml_client.MLServiceClient.search_by_image") as mock_search:
        mock_search.return_value = mock_ml_result

        files = {"file": ("query.jpg", sample_valid_jpeg, "image/jpeg")}
        response = client.post("/api/visual-search", files=files)

        assert response.status_code == 200
        data = response.json()
        assert data["total_matches"] == 3
        assert data["query_image"]["width"] == 200
        assert data["query_image"]["height"] == 200

        # Verify strict preservation of ML rank ordering
        results = data["results"]
        assert len(results) == 3
        assert results[0]["rank"] == 1
        assert results[0]["product"]["id"] == "prod_apple_iphone_15_pro"
        assert results[0]["similarity_score"] == 0.952

        assert results[1]["rank"] == 2
        assert results[1]["product"]["id"] == "prod_anker_737_charger_120w"
        assert results[1]["similarity_score"] == 0.841

        assert results[2]["rank"] == 3
        assert results[2]["product"]["id"] == "prod_apple_iphone_14"
        assert results[2]["similarity_score"] == 0.780


def test_visual_search_corrupt_image(client, sample_corrupt_image):
    files = {"file": ("bad.jpg", sample_corrupt_image, "image/jpeg")}
    response = client.post("/api/visual-search", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "CORRUPT_IMAGE"


def test_visual_search_unsupported_media_type(client):
    files = {"file": ("document.pdf", b"%PDF-1.4...", "application/pdf")}
    response = client.post("/api/visual-search", files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_visual_search_ml_service_unavailable(client, sample_valid_jpeg):
    with patch("backend.app.services.ml_client.MLServiceClient.search_by_image") as mock_search:
        mock_search.side_effect = MLServiceUnavailableError("Visual search AI service unreachable")

        files = {"file": ("query.jpg", sample_valid_jpeg, "image/jpeg")}
        response = client.post("/api/visual-search", files=files)

        assert response.status_code == 503
        data = response.json()
        assert data["error_code"] == "ML_SERVICE_UNAVAILABLE"


def test_visual_search_ml_service_timeout(client, sample_valid_jpeg):
    with patch("backend.app.services.ml_client.MLServiceClient.search_by_image") as mock_search:
        mock_search.side_effect = MLServiceTimeoutError("Inference timed out")

        files = {"file": ("query.jpg", sample_valid_jpeg, "image/jpeg")}
        response = client.post("/api/visual-search", files=files)

        assert response.status_code == 504
        data = response.json()
        assert data["error_code"] == "ML_SERVICE_TIMEOUT"
