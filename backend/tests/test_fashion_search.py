import asyncio
import io
import pytest
from PIL import Image

from backend.app.services.query_understanding import query_understanding_service
from backend.app.services.fashion_search_orchestrator import FashionSearchOrchestrator
from backend.app.schemas.search import UniversalSearchResponse


# ==============================================================================
# 1. Query Understanding Tests (Phase 3)
# ==============================================================================

def test_query_understanding_clothing_price():
    parsed = query_understanding_service.parse_query("Show me black oversized T-shirts under ₹1,000")
    assert parsed.category == "clothing"
    assert parsed.subcategory == "t-shirt"
    assert parsed.colour == "black"
    assert parsed.style in ["oversized", "streetwear"]
    assert parsed.max_price == 1000.0


def test_query_understanding_footwear_occasion():
    parsed = query_understanding_service.parse_query("Find white sneakers for college")
    assert parsed.category == "footwear"
    assert parsed.subcategory == "sneakers"
    assert parsed.colour == "white"
    assert parsed.occasion == "college"


def test_query_understanding_watches_formal():
    parsed = query_understanding_service.parse_query("Show me watches that match formal outfits")
    assert parsed.category in ["accessories", "watches"] or parsed.subcategory == "watch"
    assert parsed.occasion == "formal"


def test_query_understanding_korean_summer_dress():
    parsed = query_understanding_service.parse_query("Find a Korean-style summer dress")
    assert parsed.category == "clothing"
    assert parsed.subcategory == "dress"
    assert "korean" in parsed.style.lower()


def test_query_understanding_price_range_between():
    parsed = query_understanding_service.parse_query("sneakers between ₹1,500 and 3,000")
    assert parsed.min_price == 1500.0
    assert parsed.max_price == 3000.0


def test_query_understanding_brands_and_gender():
    parsed = query_understanding_service.parse_query("Nike casual running shoes for men")
    assert parsed.brand and parsed.brand.lower() == "nike"
    assert parsed.gender == "men"
    assert parsed.category == "footwear"


def test_query_understanding_y2k_accessories():
    parsed = query_understanding_service.parse_query("Suggest Y2K fashion accessories")
    assert parsed.category == "accessories"
    assert "y2k" in parsed.style.lower()


# ==============================================================================
# 2. Fashion Search Orchestrator Tests (Phases 4, 5, 6, 8)
# ==============================================================================

def test_orchestrator_text_search(db_session):
    orchestrator = FashionSearchOrchestrator(db=db_session)
    response = asyncio.run(orchestrator.search_text("black oversized streetwear t-shirt", limit=6))
    assert isinstance(response, UniversalSearchResponse)
    assert response.mode == "text"
    assert response.total_matches >= 1
    assert len(response.results) >= 1
    assert response.results[0].similarity_score > 0
    assert response.results[0].product.id is not None


def test_orchestrator_price_filtering(db_session):
    orchestrator = FashionSearchOrchestrator(db=db_session)
    response = asyncio.run(orchestrator.search_text("t-shirt", limit=10, manual_filters={"max_price": 999.0}))
    assert isinstance(response, UniversalSearchResponse)
    for item in response.results:
        assert item.product.price <= 999.0


def test_orchestrator_category_filtering(db_session):
    orchestrator = FashionSearchOrchestrator(db=db_session)
    response = asyncio.run(orchestrator.search_text("sneakers", limit=10, manual_filters={"category": "footwear"}))
    assert isinstance(response, UniversalSearchResponse)
    for item in response.results:
        assert item.product.category == "footwear"


# ==============================================================================
# 3. API Route Tests: POST /api/search & GET /api/search (Phases 10, 13)
# ==============================================================================

def test_api_search_text_json(client):
    payload = {"query": "black oversized t-shirt under 1000", "limit": 6}
    response = client.post("/api/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "text"
    assert data["total_matches"] >= 1
    assert "extracted_filters" in data
    assert data["extracted_filters"]["colour"] == "black"
    assert len(data["results"]) >= 1
    assert data["results"][0]["similarity_score"] > 0
    assert data["results"][0]["product"]["name"]


def test_api_search_get_endpoint(client):
    response = client.get("/api/search?q=white+sneakers&max_price=3000")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "text"
    for item in data["results"]:
        assert item["product"]["price"] <= 3000


def test_api_search_image_upload(client, sample_valid_jpeg):
    files = {"file": ("query.jpg", sample_valid_jpeg, "image/jpeg")}
    response = client.post("/api/search", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "image"
    assert data["total_matches"] >= 1
    assert len(data["results"]) >= 1
    assert data["query_image"]["width"] == 200
    assert data["query_image"]["height"] == 200


def test_api_search_hybrid_upload(client, sample_valid_jpeg):
    files = {"file": ("query.jpg", sample_valid_jpeg, "image/jpeg")}
    data = {
        "query": "vintage streetwear jacket",
        "image_weight": 0.6,
        "text_weight": 0.4,
        "limit": 5,
    }
    response = client.post("/api/search", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["mode"] == "hybrid"
    assert res["query"] == "vintage streetwear jacket"
    assert res["total_matches"] >= 1
    assert len(res["results"]) >= 1


def test_api_search_empty_input_400(client):
    response = client.post("/api/search", data={})
    assert response.status_code == 400
    assert "query" in response.json()["detail"].lower() or "image" in response.json()["detail"].lower()


def test_api_search_corrupt_image_400(client, sample_corrupt_image):
    files = {"file": ("corrupt.jpg", sample_corrupt_image, "image/jpeg")}
    response = client.post("/api/search", files=files)
    assert response.status_code == 400
    assert response.json()["error_code"] == "CORRUPT_IMAGE"


def test_api_search_unsupported_media_400(client):
    files = {"file": ("doc.pdf", b"%PDF-1.5...", "application/pdf")}
    response = client.post("/api/search", files=files)
    assert response.status_code == 400
    assert response.json()["error_code"] == "UNSUPPORTED_MEDIA_TYPE"
