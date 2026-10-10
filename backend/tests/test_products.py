def test_list_products_default_pagination(client):
    response = client.get("/api/products")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 10
    assert data["page"] == 1
    assert len(data["items"]) <= 20
    first = data["items"][0]
    assert "id" in first
    assert "specifications" in first
    assert "verification_status" in first


def test_list_products_category_filter(client):
    response = client.get("/api/products?category=smartphone")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    for item in data["items"]:
        assert item["category"] == "smartphone"


def test_list_products_brand_and_query_filter(client):
    response = client.get("/api/products?brand=Apple&q=Titanium")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any("iPhone 15 Pro" in item["name"] for item in data["items"])


def test_get_product_by_id_success(client):
    response = client.get("/api/products/prod_apple_iphone_15_pro")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "prod_apple_iphone_15_pro"
    assert data["brand"] == "Apple"
    assert data["specifications"]["port_type"] == "USB-C"
    assert data["verification_status"] == "verified"


def test_get_product_by_id_not_found(client):
    response = client.get("/api/products/prod_non_existent_device_999")
    assert response.status_code == 404
    data = response.json()
    assert data["error_code"] == "PRODUCT_NOT_FOUND"
    assert "not found" in data["detail"].lower()
