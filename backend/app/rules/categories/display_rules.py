from typing import Any, Dict, List
from backend.app.db.models import Product
from backend.app.rules.base import BaseCategoryRule, RuleContext
from backend.app.schemas.compatibility import CheckOutcome, CheckSeverity


class DisplayDeviceCompatibilityRule(BaseCategoryRule):
    """
    Evaluates video transmission and bidirectional power delivery between external monitors and host computers/smartphones.
    """

    rule_id = "rule_display_device"
    title = "External Display & Video Output Compatibility"

    def matches(self, existing: Product, candidate: Product) -> bool:
        cats = {existing.category.lower(), candidate.category.lower()}
        return "monitor" in cats and any(c in cats for c in ["laptop", "smartphone", "tablet"])

    def evaluate(self, ctx: RuleContext) -> None:
        if ctx.existing.category.lower() == "monitor":
            monitor = ctx.existing
            device = ctx.candidate
        else:
            device = ctx.existing
            monitor = ctx.candidate

        m_specs: Dict[str, Any] = monitor.specifications or {}
        d_specs: Dict[str, Any] = device.specifications or {}

        # 1. Video Output Protocol Check
        device_video_out = d_specs.get("video_out_support")
        monitor_inputs: List[str] = m_specs.get("video_inputs") or []

        if not device_video_out:
            ctx.add_missing_spec(device.id, device.name, "video_out_support", "Video output specifications missing")
            ctx.add_check(
                check_id="display_video_protocol",
                title="Video Transmission Standard",
                property_checked="video_out_support",
                existing_value="Not specified",
                candidate_value=monitor_inputs,
                rule_applied="Host device must support native video output protocol accepted by monitor",
                outcome=CheckOutcome.CANNOT_VERIFY,
                severity=CheckSeverity.CRITICAL,
                explanation=f"{device.name} does not have documented native external display video output capabilities.",
            )
        else:
            # Check for DP Alt Mode or HDMI or Thunderbolt compatibility
            dev_str = str(device_video_out).upper()
            m_inputs_str = " ".join([str(i).upper() for i in monitor_inputs])

            can_connect = (
                ("DISPLAYPORT" in dev_str and "DISPLAYPORT" in m_inputs_str) or
                ("DP ALT MODE" in dev_str and "DP ALT MODE" in m_inputs_str) or
                ("THUNDERBOLT" in dev_str and "USB-C" in m_inputs_str) or
                ("HDMI" in dev_str and "HDMI" in m_inputs_str)
            )

            if can_connect:
                ctx.add_check(
                    check_id="display_video_protocol",
                    title="Video Transmission Standard",
                    property_checked="video_out_support",
                    existing_value=device_video_out,
                    candidate_value=monitor_inputs,
                    rule_applied="Host video output standard matches monitor input standard",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Video connection supported: {device.name} output ({device_video_out}) interfaces directly with monitor inputs ({', '.join(monitor_inputs)}).",
                )
            else:
                ctx.add_check(
                    check_id="display_video_protocol",
                    title="Video Transmission Standard",
                    property_checked="video_out_support",
                    existing_value=device_video_out,
                    candidate_value=monitor_inputs,
                    rule_applied="Host video output standard must match monitor inputs",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Incompatible video interface: {device.name} requires {device_video_out}, which does not match available monitor ports ({', '.join(monitor_inputs)}).",
                )

        # 2. Monitor Reverse USB-C Power Delivery Check
        monitor_pd_w = m_specs.get("usb_c_power_delivery_w")
        device_min_w = d_specs.get("min_recommended_charger_w")

        if monitor_pd_w is not None and device_min_w is not None:
            if float(monitor_pd_w) >= float(device_min_w):
                ctx.add_check(
                    check_id="display_power_delivery",
                    title="Single-Cable Monitor Power Delivery",
                    property_checked="usb_c_power_delivery_w",
                    existing_value=f"{device_min_w}W (required)",
                    candidate_value=f"{monitor_pd_w}W (supplied by monitor)",
                    rule_applied="Monitor upstream USB-C Power Delivery satisfies laptop operating requirement",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.INFO,
                    explanation=f"Monitor delivers up to {monitor_pd_w}W upstream over USB-C, enabling single-cable display and charging for {device.name}.",
                )
            else:
                ctx.add_check(
                    check_id="display_power_delivery",
                    title="Single-Cable Monitor Power Delivery",
                    property_checked="usb_c_power_delivery_w",
                    existing_value=f"{device_min_w}W (required)",
                    candidate_value=f"{monitor_pd_w}W (supplied by monitor)",
                    rule_applied="Monitor upstream power delivery meets minimum wattage",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.WARNING,
                    explanation=f"Monitor supplies {monitor_pd_w}W over USB-C, but {device.name} recommends at least {device_min_w}W. Laptop may need its dedicated power adapter.",
                )
