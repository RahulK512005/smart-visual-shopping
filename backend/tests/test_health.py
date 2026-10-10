from unittest.mock import patch


def test_health_check_endpoint(client):
    with patch("backend.app.services.ml_client.MLServiceClient.check_health") as mock_ml_health:
        mock_ml_health.return_value = {"status": "reachable", "details": {"model": "clip-vit"}}
        
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["dependencies"]["database"]["status"] == "healthy"
        assert data["dependencies"]["ml_visual_search_service"]["status"] == "reachable"


def test_health_check_when_ml_unreachable(client):
    with patch("backend.app.services.ml_client.MLServiceClient.check_health") as mock_ml_health:
        mock_ml_health.return_value = {"status": "unreachable", "error": "Connection refused"}

        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["dependencies"]["ml_visual_search_service"]["status"] == "unreachable"
