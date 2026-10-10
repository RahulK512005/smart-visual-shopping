from typing import Any, Dict
from backend.app.db.models import Product
from backend.app.rules.base import BaseCategoryRule, RuleContext
from backend.app.schemas.compatibility import CheckOutcome, CheckSeverity


class WearablePhoneCompatibilityRule(BaseCategoryRule):
    """
    Evaluates pairing and ecosystem compatibility between a smartwatch/wearable and a smartphone.
    """

    rule_id = "rule_wearable_phone"
    title = "Wearable & Smartwatch Ecosystem Compatibility"

    def matches(self, existing: Product, candidate: Product) -> bool:
        cats = {existing.category.lower(), candidate.category.lower()}
        return "smartwatch" in cats and "smartphone" in cats

    def evaluate(self, ctx: RuleContext) -> None:
        if ctx.existing.category.lower() == "smartwatch":
            watch = ctx.existing
            phone = ctx.candidate
        else:
            phone = ctx.existing
            watch = ctx.candidate

        w_specs: Dict[str, Any] = watch.specifications or {}
        p_specs: Dict[str, Any] = phone.specifications or {}

        # 1. Operating System Ecosystem Match
        watch_target_os = str(w_specs.get("compatible_os") or "").upper()
        phone_os = str(p_specs.get("os") or "").upper()

        if not watch_target_os or not phone_os:
            ctx.add_missing_spec(watch.id, watch.name, "compatible_os", "Watch supported host OS undefined")
            ctx.add_check(
                check_id="wearable_os_ecosystem",
                title="Operating System Ecosystem Match",
                property_checked="compatible_os",
                existing_value=p_specs.get("os"),
                candidate_value=w_specs.get("compatible_os"),
                rule_applied="Wearable companion software must be supported on phone OS",
                outcome=CheckOutcome.CANNOT_VERIFY,
                severity=CheckSeverity.CRITICAL,
                explanation="Missing OS specifications to verify ecosystem compatibility.",
            )
        else:
            # Check for direct mismatch
            if "IOS" in watch_target_os and "ANDROID" in phone_os:
                ctx.add_check(
                    check_id="wearable_os_ecosystem",
                    title="Operating System Ecosystem Match",
                    property_checked="compatible_os",
                    existing_value=f"Phone OS: {phone_os}",
                    candidate_value=f"Watch requires: {watch_target_os}",
                    rule_applied="Apple Watch requires iOS host device and cannot be paired with Android devices",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"{watch.name} requires an Apple iPhone running iOS and does not pair with Android devices like {phone.name}.",
                )
            elif "ANDROID" in watch_target_os and "IOS" in phone_os:
                ctx.add_check(
                    check_id="wearable_os_ecosystem",
                    title="Operating System Ecosystem Match",
                    property_checked="compatible_os",
                    existing_value=f"Phone OS: {phone_os}",
                    candidate_value=f"Watch requires: {watch_target_os}",
                    rule_applied="Modern Wear OS smartwatches do not support pairing with iOS devices",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"{watch.name} requires an Android smartphone with Google Play Services and does not support iOS.",
                )
            elif watch_target_os in phone_os or phone_os in watch_target_os:
                ctx.add_check(
                    check_id="wearable_os_ecosystem",
                    title="Operating System Ecosystem Match",
                    property_checked="compatible_os",
                    existing_value=f"Phone OS: {phone_os}",
                    candidate_value=f"Watch requires: {watch_target_os}",
                    rule_applied="Phone operating system matches smartwatch companion requirements",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Operating system match verified: Both devices belong to the {phone_os} ecosystem.",
                )
            else:
                ctx.add_check(
                    check_id="wearable_os_ecosystem",
                    title="Operating System Ecosystem Match",
                    property_checked="compatible_os",
                    existing_value=phone_os,
                    candidate_value=watch_target_os,
                    rule_applied="OS compatibility match",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Incompatible platform: {phone.name} runs {phone_os}, whereas {watch.name} requires {watch_target_os}.",
                )

        # 2. Minimum OS Version Check
        min_os_str = w_specs.get("min_os_version")
        phone_os_ver = p_specs.get("os_version")

        if min_os_str and phone_os_ver:
            try:
                # Extract numeric version
                import re
                min_v_matches = re.findall(r"\d+\.?\d*", str(min_os_str))
                phone_v_matches = re.findall(r"\d+\.?\d*", str(phone_os_ver))
                if min_v_matches and phone_v_matches:
                    min_v = float(min_v_matches[0])
                    phone_v = float(phone_v_matches[0])
                    if phone_v >= min_v:
                        ctx.add_check(
                            check_id="wearable_os_version",
                            title="Minimum OS Version Requirement",
                            property_checked="min_os_version",
                            existing_value=f"v{phone_v}",
                            candidate_value=f"Min required: v{min_v}",
                            rule_applied="Phone OS version satisfies minimum required release",
                            outcome=CheckOutcome.PASS,
                            severity=CheckSeverity.CRITICAL,
                            explanation=f"Phone OS version ({phone_os_ver}) meets or exceeds watch minimum requirement ({min_os_str}).",
                        )
                    else:
                        ctx.add_check(
                            check_id="wearable_os_version",
                            title="Minimum OS Version Requirement",
                            property_checked="min_os_version",
                            existing_value=f"v{phone_v}",
                            candidate_value=f"Min required: v{min_v}",
                            rule_applied="Phone OS version must meet minimum required release",
                            outcome=CheckOutcome.FAIL,
                            severity=CheckSeverity.CRITICAL,
                            explanation=f"Phone OS version ({phone_os_ver}) is below the required version ({min_os_str}).",
                        )
            except Exception:
                pass

        # 3. Bluetooth Standard
        w_bt = w_specs.get("bluetooth_version")
        p_bt = p_specs.get("bluetooth_version")
        if w_bt and p_bt:
            ctx.add_check(
                check_id="wearable_bluetooth",
                title="Bluetooth Radio Standard",
                property_checked="bluetooth_version",
                existing_value=f"BT {p_bt}",
                candidate_value=f"BT {w_bt}",
                rule_applied="Both devices support Bluetooth Low Energy (BLE) standards",
                outcome=CheckOutcome.PASS,
                severity=CheckSeverity.INFO,
                explanation=f"Both devices support modern Bluetooth Low Energy (Phone: {p_bt}, Watch: {w_bt}) for efficient synchronization.",
            )
