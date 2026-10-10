import httpx
import pytest
from unittest.mock import patch, MagicMock
from backend.app.services.ml_client import MLServiceClient
from backend.app.core.errors import MLServiceUnavailableError, MLServiceTimeoutError


def test_ml_client_successful_search():
    client = MLServiceClient(base_url="http://test-ml:8001")
    fake_response_data = {
        "results": [
            {"product_id": "prod_1", "score": 0.95, "detection_label": "phone"}
        ],
        "model_version": "v1.0",
        "inference_time_ms": 12.3
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = fake_response_data

    with patch("httpx.Client.post", return_value=mock_resp):
        res = client.search_by_image(b"fake_image_bytes")
        assert len(res.results) == 1
        assert res.results[0].product_id == "prod_1"
        assert res.results[0].score == 0.95


def test_ml_client_connect_timeout():
    client = MLServiceClient(base_url="http://test-ml:8001")
    with patch("httpx.Client.post", side_effect=httpx.ConnectTimeout("Connect timed out")):
        with pytest.raises(MLServiceTimeoutError):
            client.search_by_image(b"fake_image_bytes")


def test_ml_client_read_timeout():
    client = MLServiceClient(base_url="http://test-ml:8001")
    with patch("httpx.Client.post", side_effect=httpx.ReadTimeout("Inference read timed out")):
        with pytest.raises(MLServiceTimeoutError):
            client.search_by_image(b"fake_image_bytes")


def test_ml_client_connection_refused():
    client = MLServiceClient(base_url="http://test-ml:8001")
    with patch("httpx.Client.post", side_effect=httpx.ConnectError("Connection refused")):
        with pytest.raises(MLServiceUnavailableError):
            client.search_by_image(b"fake_image_bytes")


def test_ml_client_500_response():
    client = MLServiceClient(base_url="http://test-ml:8001")
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.text = "Internal Server Error in GPU worker"

    with patch("httpx.Client.post", return_value=mock_resp):
        with pytest.raises(MLServiceUnavailableError):
            client.search_by_image(b"fake_image_bytes")
