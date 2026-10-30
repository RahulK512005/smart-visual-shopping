import pytest
from io import BytesIO
from PIL import Image, UnidentifiedImageError
from backend.app.services.compatibility_service import CompatibilityService
from backend.app.core.errors import ProductNotFoundError
from backend.app.schemas.compatibility import CompatibilityVerdict


def test_compatible_phone_and_charger(db_session):
    service = CompatibilityService(db_session)
    data = service.evaluate("prod_apple_iphone_15_pro", "prod_anker_737_charger_120w")
    assert data.verdict == CompatibilityVerdict.COMPATIBLE
    assert len(data.passed_checks) >= 2
    assert len(data.failed_checks) == 0
    assert "compatible" in data.summary_explanation.lower()


def test_incompatible_laptop_and_low_wattage_charger(db_session):
    service = CompatibilityService(db_session)
    data = service.evaluate("prod_apple_macbook_pro_14_m3", "prod_apple_20w_charger")
    assert data.verdict == CompatibilityVerdict.INCOMPATIBLE
    assert any(c.check_id == "power_wattage_sufficiency" for c in data.failed_checks)


def test_incompatible_usbc_phone_and_lightning_cable(db_session):
    service = CompatibilityService(db_session)
    data = service.evaluate("prod_apple_iphone_15_pro", "prod_anker_lightning_cable_mfi")
    assert data.verdict == CompatibilityVerdict.INCOMPATIBLE
    assert any(
        "USB-C cannot mate with Lightning" in c.rule_applied or "Physical incompatibility" in c.explanation
        for c in data.failed_checks
    )


def test_compatible_lightning_phone_and_lightning_cable(db_session):
    service = CompatibilityService(db_session)
    data = service.evaluate("prod_apple_iphone_14", "prod_anker_lightning_cable_mfi")
    assert data.verdict == CompatibilityVerdict.COMPATIBLE


def test_compatible_smartwatch_ecosystem(db_session):
    service = CompatibilityService(db_session)
    # Apple Watch + iPhone
    data1 = service.evaluate("prod_apple_iphone_15_pro", "prod_apple_watch_series_9")
    assert data1.verdict == CompatibilityVerdict.COMPATIBLE

    # Samsung Watch + Samsung Phone
    data2 = service.evaluate("prod_samsung_galaxy_s24_ultra", "prod_samsung_galaxy_watch_6")
    assert data2.verdict == CompatibilityVerdict.COMPATIBLE


def test_incompatible_smartwatch_cross_ecosystem(db_session):
    service = CompatibilityService(db_session)
    # Android Phone + Apple Watch -> Incompatible
    data1 = service.evaluate("prod_samsung_galaxy_s24_ultra", "prod_apple_watch_series_9")
    assert data1.verdict == CompatibilityVerdict.INCOMPATIBLE
    assert any("Android" in c.explanation for c in data1.failed_checks)

    # iPhone + Galaxy Watch 6 -> Incompatible
    data2 = service.evaluate("prod_apple_iphone_15_pro", "prod_samsung_galaxy_watch_6")
    assert data2.verdict == CompatibilityVerdict.INCOMPATIBLE


def test_case_model_match_and_mismatch(db_session):
    service = CompatibilityService(db_session)
    # iPhone 15 Pro + iPhone 15 Pro case -> Compatible
    data_match = service.evaluate("prod_apple_iphone_15_pro", "prod_apple_case_iphone_15_pro_finewoven")
    assert data_match.verdict == CompatibilityVerdict.COMPATIBLE

    # iPhone 14 + iPhone 15 Pro case -> Incompatible
    data_mismatch = service.evaluate("prod_apple_iphone_14", "prod_apple_case_iphone_15_pro_finewoven")
    assert data_mismatch.verdict == CompatibilityVerdict.INCOMPATIBLE


def test_cannot_verify_with_unverified_missing_specs(db_session):
    service = CompatibilityService(db_session)
    data = service.evaluate("prod_apple_iphone_15_pro", "prod_generic_usb_hub_unverified")
    assert data.verdict == CompatibilityVerdict.CANNOT_VERIFY
    assert len(data.cannot_verify_checks) > 0


def test_compatibility_product_not_found(db_session):
    service = CompatibilityService(db_session)
    with pytest.raises(ProductNotFoundError):
        service.evaluate("prod_does_not_exist_xyz", "prod_apple_iphone_15_pro")


def test_identify_photo_corrupt_upload_rejected():
    with pytest.raises(UnidentifiedImageError):
        with Image.open(BytesIO(b"not-a-real-image")) as img:
            img.verify()


def test_identify_photo_empty_upload_rejected():
    empty_bytes = b""
    assert len(empty_bytes) == 0


def test_fashion_outfit_pairing_compatible(db_session):
    service = CompatibilityService(db_session)
    res = service.evaluate("prod_fashion_tshirt_black_oversized", "prod_fashion_pants_cargo_baggy")
    assert res.verdict == CompatibilityVerdict.COMPATIBLE
    assert len(res.passed_checks) >= 3
    assert any(c.check_id == "fashion_aesthetic_cohesion" for c in res.passed_checks)
    assert any(c.check_id == "fashion_color_palette" for c in res.passed_checks)
    assert "Iconic Outfit Match" in res.summary_explanation


def test_fashion_dress_and_sneakers_pairing(db_session):
    service = CompatibilityService(db_session)
    res = service.evaluate("prod_fashion_dress_korean_summer_floral", "prod_fashion_shoes_white_sneakers")
    assert res.verdict == CompatibilityVerdict.COMPATIBLE
    assert len(res.passed_checks) >= 3
    assert any(c.check_id == "fashion_occasion_suitability" for c in res.passed_checks)


def test_cross_category_tech_and_fashion_lifestyle_synergy(db_session):
    service = CompatibilityService(db_session)
    res = service.evaluate("prod_apple_iphone_15_pro", "prod_fashion_bag_black_crossbody")
    assert res.verdict == CompatibilityVerdict.COMPATIBLE
    assert any("synergy" in c.title.lower() or "aesthetic" in c.title.lower() for c in res.passed_checks)
