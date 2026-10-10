from backend.app.db.init_db import init_db
from backend.app.db.repositories.product_repo import ProductRepository


def test_seed_reproducibility(db_session):
    # Run seed first time
    count1 = init_db(db_session)
    assert count1 >= 14

    # Run seed second time to verify idempotency and non-duplication
    count2 = init_db(db_session)
    assert count2 == count1

    repo = ProductRepository(db_session)
    items, total = repo.list_products(limit=100)
    assert total == count1


def test_display_compatibility(client):
    # MacBook Pro 14 (Thunderbolt 4 / DP Alt Mode) + Dell U2723QE 4K (USB-C DP Alt Mode & 90W PD)
    payload = {
        "existing_product_id": "prod_apple_macbook_pro_14_m3",
        "candidate_product_id": "prod_dell_u2723qe_4k_monitor"
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "compatible"
    assert any(c["check_id"] == "display_video_protocol" and c["outcome"] == "pass" for c in data["passed_checks"])
    assert any(c["check_id"] == "display_power_delivery" and c["outcome"] == "pass" for c in data["passed_checks"])


def test_audio_headphones_compatibility(client):
    # iPhone 15 Pro + Sony WH-1000XM5 (Wireless Bluetooth)
    payload = {
        "existing_product_id": "prod_apple_iphone_15_pro",
        "candidate_product_id": "prod_sony_wh1000xm5"
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "compatible"
    assert any(c["check_id"] == "audio_bluetooth_link" and c["outcome"] == "pass" for c in data["passed_checks"])


def test_unrelated_category_pair_cannot_verify(client):
    # Laptop + Protective Phone Case
    payload = {
        "existing_product_id": "prod_apple_macbook_pro_14_m3",
        "candidate_product_id": "prod_apple_case_iphone_15_pro_finewoven"
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "cannot_verify"
