from typing import Any, Dict
from backend.app.db.models import Product
from backend.app.rules.base import BaseCategoryRule, RuleContext
from backend.app.schemas.compatibility import CheckOutcome, CheckSeverity


class CableDeviceCompatibilityRule(BaseCategoryRule):
    """
    Evaluates physical connector mating and wattage throughput between a cable and a connected device.
    """

    rule_id = "rule_cable_device"
    title = "Cable Connector & Throughput Compatibility"

    def matches(self, existing: Product, candidate: Product) -> bool:
        cats = {existing.category.lower(), candidate.category.lower()}
        return "cable" in cats and any(c in cats for c in ["smartphone", "laptop", "charger", "tablet"])

    def evaluate(self, ctx: RuleContext) -> None:
        if ctx.existing.category.lower() == "cable":
            cable = ctx.existing
            device = ctx.candidate
        else:
            device = ctx.existing
            cable = ctx.candidate

        c_specs: Dict[str, Any] = cable.specifications or {}
        d_specs: Dict[str, Any] = device.specifications or {}

        # 1. Connector pin / plug interface match
        cable_connectors = [
            str(c_specs.get("source_connector", "")).upper(),
            str(c_specs.get("target_connector", "")).upper(),
        ]
        cable_connectors = [c for c in cable_connectors if c]

        device_port = str(d_specs.get("port_type") or d_specs.get("connector_type") or "").upper()

        if not cable_connectors or not device_port:
            ctx.add_check(
                check_id="cable_connector_mating",
                title="Cable Connector Mating",
                property_checked="connector_types",
                existing_value=device_port or "Unknown",
                candidate_value=cable_connectors or "Unknown",
                rule_applied="At least one end of the cable must match the physical port on the device",
                outcome=CheckOutcome.CANNOT_VERIFY,
                severity=CheckSeverity.CRITICAL,
                explanation="Incomplete connector details preventing verification of physical connection.",
            )
        else:
            matched = any(conn in device_port or device_port in conn for conn in cable_connectors)
            
            # Special check: USB-C device vs Lightning cable
            if "LIGHTNING" in cable_connectors and "USB-C" in device_port and "LIGHTNING" not in device_port:
                ctx.add_check(
                    check_id="cable_connector_mating",
                    title="Cable Connector Mating",
                    property_checked="connector_types",
                    existing_value=d_specs.get("port_type"),
                    candidate_value=f"{c_specs.get('source_connector')} to {c_specs.get('target_connector')}",
                    rule_applied="Device port requires matching plug type (USB-C cannot mate with Lightning)",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Physical incompatibility: {device.name} requires a USB-C plug, but this cable terminates in Lightning.",
                )
            elif "LIGHTNING" in device_port and not any("LIGHTNING" in conn for conn in cable_connectors):
                ctx.add_check(
                    check_id="cable_connector_mating",
                    title="Cable Connector Mating",
                    property_checked="connector_types",
                    existing_value=d_specs.get("port_type"),
                    candidate_value=f"{c_specs.get('source_connector')} to {c_specs.get('target_connector')}",
                    rule_applied="Device port requires matching plug type (Lightning host requires Lightning plug)",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Physical incompatibility: {device.name} requires a Lightning cable, but this cable lacks a Lightning connector.",
                )
            elif matched:
                ctx.add_check(
                    check_id="cable_connector_mating",
                    title="Cable Connector Mating",
                    property_checked="connector_types",
                    existing_value=d_specs.get("port_type"),
                    candidate_value=f"{c_specs.get('source_connector')} to {c_specs.get('target_connector')}",
                    rule_applied="Cable provides matching physical plug for device interface",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Physical interface verified: Cable connectors match the {d_specs.get('port_type')} port on {device.name}.",
                )
            else:
                ctx.add_check(
                    check_id="cable_connector_mating",
                    title="Cable Connector Mating",
                    property_checked="connector_types",
                    existing_value=device_port,
                    candidate_value=cable_connectors,
                    rule_applied="Cable end must mate with device socket",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Neither end of cable ({cable_connectors}) mates with device port ({device_port}).",
                )

        # 2. Power Throughput Capacity
        cable_wattage = c_specs.get("max_supported_wattage_w")
        device_min_w = d_specs.get("min_recommended_charger_w")

        if cable_wattage is not None and device_min_w is not None:
            if float(cable_wattage) >= float(device_min_w):
                ctx.add_check(
                    check_id="cable_power_capacity",
                    title="Cable Power Delivery Throughput",
                    property_checked="max_supported_wattage_w",
                    existing_value=f"{device_min_w}W (required)",
                    candidate_value=f"{cable_wattage}W (rated rating)",
                    rule_applied="Cable current capacity (E-Marker) must support host device power consumption",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Cable supports up to {cable_wattage}W, safely accommodating device requirement of {device_min_w}W.",
                )
            else:
                ctx.add_check(
                    check_id="cable_power_capacity",
                    title="Cable Power Delivery Throughput",
                    property_checked="max_supported_wattage_w",
                    existing_value=f"{device_min_w}W (required)",
                    candidate_value=f"{cable_wattage}W (rated rating)",
                    rule_applied="Cable must not bottleneck required charging wattage",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.WARNING,
                    explanation=f"Cable is limited to {cable_wattage}W, which is below the device's recommended {device_min_w}W. Charging will be severely throttled.",
                )
