from typing import Any, Dict, List
from backend.app.db.models import Product
from backend.app.rules.base import BaseCategoryRule, RuleContext
from backend.app.schemas.compatibility import CheckOutcome, CheckSeverity


class AudioDeviceCompatibilityRule(BaseCategoryRule):
    """
    Evaluates wireless Bluetooth audio and wired 3.5mm analog connectivity between headphones and host devices.
    """

    rule_id = "rule_audio_device"
    title = "Audio Interface & Codec Compatibility"

    def matches(self, existing: Product, candidate: Product) -> bool:
        cats = {existing.category.lower(), candidate.category.lower()}
        return "audio" in cats and any(c in cats for c in ["smartphone", "laptop", "tablet"])

    def evaluate(self, ctx: RuleContext) -> None:
        if ctx.existing.category.lower() == "audio":
            audio = ctx.existing
            device = ctx.candidate
        else:
            device = ctx.existing
            audio = ctx.candidate

        a_specs: Dict[str, Any] = audio.specifications or {}
        d_specs: Dict[str, Any] = device.specifications or {}

        # 1. Wireless Bluetooth Pairing
        a_bt = a_specs.get("bluetooth_version")
        d_bt = d_specs.get("bluetooth_version")

        if a_bt and d_bt:
            ctx.add_check(
                check_id="audio_bluetooth_link",
                title="Bluetooth Audio Link",
                property_checked="bluetooth_version",
                existing_value=f"BT {d_bt}",
                candidate_value=f"BT {a_bt}",
                rule_applied="Standard A2DP Bluetooth audio profile interoperability",
                outcome=CheckOutcome.PASS,
                severity=CheckSeverity.CRITICAL,
                explanation=f"Wireless audio link verified: Both devices support modern Bluetooth (Device: {d_bt}, Headphones: {a_bt}) with backward compatibility.",
            )

        # 2. Wired 3.5mm Headphone Jack Requirement
        requires_3_5mm = a_specs.get("headphone_jack_3_5mm_required", False)
        device_has_3_5mm = d_specs.get("headphone_jack_3_5mm", False)

        if requires_3_5mm:
            if device_has_3_5mm:
                ctx.add_check(
                    check_id="audio_wired_3_5mm",
                    title="3.5mm Analog Audio Jack",
                    property_checked="headphone_jack_3_5mm",
                    existing_value="3.5mm Jack Present",
                    candidate_value="3.5mm Required",
                    rule_applied="Device provides dedicated 3.5mm stereo output jack",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"{device.name} includes an integrated 3.5mm headphone jack.",
                )
            else:
                ctx.add_check(
                    check_id="audio_wired_3_5mm",
                    title="3.5mm Analog Audio Jack",
                    property_checked="headphone_jack_3_5mm",
                    existing_value="No 3.5mm Jack",
                    candidate_value="3.5mm Required",
                    rule_applied="Device must possess 3.5mm stereo jack for wired headphones",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"{device.name} lacks a 3.5mm audio jack. Requires a USB-C/Lightning analog audio adapter.",
                )

        # 3. High-Definition Audio Codec Negotiation (LDAC, AAC, aptX)
        a_codecs: List[str] = a_specs.get("bluetooth_codecs") or []
        d_codecs: List[str] = d_specs.get("supported_audio_codecs") or []

        if a_codecs and d_codecs:
            shared = [c for c in a_codecs if c in d_codecs]
            if shared:
                ctx.add_check(
                    check_id="audio_codecs_hd",
                    title="High-Resolution Audio Codecs",
                    property_checked="bluetooth_codecs",
                    existing_value=d_codecs,
                    candidate_value=a_codecs,
                    rule_applied="Host device and headphones negotiate high-fidelity Bluetooth codecs",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.INFO,
                    explanation=f"High-resolution audio verified: Both devices support shared HD codecs ({', '.join(shared)}).",
                )
