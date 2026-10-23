def test_compatible_phone_and_charger(client):
    payload = {
        "existing_product_id": "prod_apple_iphone_15_pro",
        "candidate_product_id": "prod_anker_737_charger_120w"
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "compatible"
    assert len(data["passed_checks"]) >= 2
    assert len(data["failed_checks"]) == 0
    assert "compatible" in data["summary_explanation"].lower()


def test_incompatible_laptop_and_low_wattage_charger(client):
    payload = {
        "existing_product_id": "prod_apple_macbook_pro_14_m3",  # Requires min 70W
        "candidate_product_id": "prod_apple_20w_charger"        # Only supplies 20W
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "incompatible"
    assert any(c["check_id"] == "power_wattage_sufficiency" for c in data["failed_checks"])


def test_incompatible_usbc_phone_and_lightning_cable(client):
    payload = {
        "existing_product_id": "prod_apple_iphone_15_pro",  # Has USB-C port
        "candidate_product_id": "prod_anker_lightning_cable_mfi"  # Has Lightning plug
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "incompatible"
    assert any("USB-C cannot mate with Lightning" in c["rule_applied"] or "Physical incompatibility" in c["explanation"] for c in data["failed_checks"])


def test_compatible_lightning_phone_and_lightning_cable(client):
    payload = {
        "existing_product_id": "prod_apple_iphone_14",  # Has Lightning port
        "candidate_product_id": "prod_anker_lightning_cable_mfi"  # Lightning cable
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "compatible"


def test_compatible_smartwatch_ecosystem(client):
    # Apple Watch + iPhone
    payload = {
        "existing_product_id": "prod_apple_iphone_15_pro",
        "candidate_product_id": "prod_apple_watch_series_9"
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "compatible"

    # Samsung Watch + Samsung Phone
    payload2 = {
        "existing_product_id": "prod_samsung_galaxy_s24_ultra",
        "candidate_product_id": "prod_samsung_galaxy_watch_6"
    }
    response2 = client.post("/api/compatibility/check", json=payload2)
    assert response2.status_code == 200
    assert response2.json()["verdict"] == "compatible"


def test_incompatible_smartwatch_cross_ecosystem(client):
    # Android Phone + Apple Watch -> Incompatible
    payload = {
        "existing_product_id": "prod_samsung_galaxy_s24_ultra",
        "candidate_product_id": "prod_apple_watch_series_9"
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "incompatible"
    assert any("Android" in c["explanation"] for c in data["failed_checks"])

    # iPhone + Galaxy Watch 6 -> Incompatible
    payload2 = {
        "existing_product_id": "prod_apple_iphone_15_pro",
        "candidate_product_id": "prod_samsung_galaxy_watch_6"
    }
    response2 = client.post("/api/compatibility/check", json=payload2)
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["verdict"] == "incompatible"


def test_case_model_match_and_mismatch(client):
    # iPhone 15 Pro + iPhone 15 Pro case -> Compatible
    payload_match = {
        "existing_product_id": "prod_apple_iphone_15_pro",
        "candidate_product_id": "prod_apple_case_iphone_15_pro_finewoven"
    }
    res_match = client.post("/api/compatibility/check", json=payload_match)
    assert res_match.status_code == 200
    assert res_match.json()["verdict"] == "compatible"

    # iPhone 14 + iPhone 15 Pro case -> Incompatible
    payload_mismatch = {
        "existing_product_id": "prod_apple_iphone_14",
        "candidate_product_id": "prod_apple_case_iphone_15_pro_finewoven"
    }
    res_mismatch = client.post("/api/compatibility/check", json=payload_mismatch)
    assert res_mismatch.status_code == 200
    assert res_mismatch.json()["verdict"] == "incompatible"


def test_cannot_verify_with_unverified_missing_specs(client):
    payload = {
        "existing_product_id": "prod_apple_iphone_15_pro",
        "candidate_product_id": "prod_generic_usb_hub_unverified"
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "cannot_verify"
    assert len(data["cannot_verify_checks"]) > 0


def test_compatibility_product_not_found(client):
    payload = {
        "existing_product_id": "prod_does_not_exist_xyz",
        "candidate_product_id": "prod_apple_iphone_15_pro"
    }
    response = client.post("/api/compatibility/check", json=payload)
    assert response.status_code == 404
    data = response.json()
    assert data["error_code"] == "PRODUCT_NOT_FOUND"


def test_identify_photo_corrupt_upload_rejected(client):
    files = {"file": ("corrupt.jpg", b"not-a-real-image", "image/jpeg")}
    response = client.post("/api/compatibility/identify-photo", files=files)
    assert response.status_code == 400
    assert response.json()["error_code"] == "CORRUPT_IMAGE"


def test_identify_photo_empty_upload_rejected(client):
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/compatibility/identify-photo", files=files)
    assert response.status_code == 400
    assert response.json()["error_code"] == "EMPTY_FILE"

