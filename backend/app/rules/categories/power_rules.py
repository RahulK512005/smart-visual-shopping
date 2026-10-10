from typing import Any, Dict, List
from backend.app.db.models import Product
from backend.app.rules.base import BaseCategoryRule, RuleContext
from backend.app.schemas.compatibility import CheckOutcome, CheckSeverity


class ChargerDevicePowerRule(BaseCategoryRule):
    """
    Evaluates compatibility between a power source (charger/adapter) and a consuming host device (smartphone/laptop).
    """

    rule_id = "rule_power_charger_device"
    title = "Power & Charging Compatibility"

    def matches(self, existing: Product, candidate: Product) -> bool:
        cats = {existing.category.lower(), candidate.category.lower()}
        return "charger" in cats and any(c in cats for c in ["smartphone", "laptop", "tablet"])

    def evaluate(self, ctx: RuleContext) -> None:
        if ctx.existing.category.lower() == "charger":
            charger = ctx.existing
            device = ctx.candidate
        else:
            device = ctx.existing
            charger = ctx.candidate

        c_specs: Dict[str, Any] = charger.specifications or {}
        d_specs: Dict[str, Any] = device.specifications or {}

        # 1. Physical connector interface check
        charger_ports: List[str] = c_specs.get("output_ports") or [c_specs.get("connector_type")] if c_specs.get("connector_type") else []
        device_port = d_specs.get("port_type")

        if not charger_ports or not device_port:
            if not charger_ports:
                ctx.add_missing_spec(charger.id, charger.name, "output_ports", "Cannot verify connector interface compatibility")
            if not device_port:
                ctx.add_missing_spec(device.id, device.name, "port_type", "Cannot verify host device connector type")
            ctx.add_check(
                check_id="power_physical_port",
                title="Physical Connector Interface",
                property_checked="connector_interface",
                existing_value=device_port,
                candidate_value=charger_ports,
                rule_applied="Charger output port must accommodate host device connector standard",
                outcome=CheckOutcome.CANNOT_VERIFY,
                severity=CheckSeverity.CRITICAL,
                explanation="Missing port specification on either charger or device to confirm physical connection.",
            )
        else:
            # Check if USB-C or common interface exists
            c_ports_upper = [p.upper() for p in charger_ports if p]
            d_port_upper = str(device_port).upper()

            # For laptops/smartphones with USB-C or Lightning
            compatible_connector = False
            if "USB-C" in d_port_upper and any("USB-C" in p for p in c_ports_upper):
                compatible_connector = True
            elif "LIGHTNING" in d_port_upper and any("USB-C" in p or "USB-A" in p for p in c_ports_upper):
                # Lightning cables can bridge USB-C/USB-A chargers to Lightning
                compatible_connector = True
            elif "MAGSAFE" in d_port_upper and any("USB-C" in p for p in c_ports_upper):
                compatible_connector = True

            if compatible_connector:
                ctx.add_check(
                    check_id="power_physical_port",
                    title="Physical Connector Interface",
                    property_checked="connector_interface",
                    existing_value=device_port,
                    candidate_value=charger_ports,
                    rule_applied="Charger output port must be compatible with device charging cables",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Charger output ports ({', '.join(charger_ports)}) provide a compatible interface for {device.name} ({device_port}).",
                )
            else:
                ctx.add_check(
                    check_id="power_physical_port",
                    title="Physical Connector Interface",
                    property_checked="connector_interface",
                    existing_value=device_port,
                    candidate_value=charger_ports,
                    rule_applied="Charger output port must be compatible with device charging cables",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Charger ports ({', '.join(charger_ports)}) cannot interface directly with device port ({device_port}).",
                )

        # 2. Charging Protocol negotiation check
        charger_protocols: List[str] = c_specs.get("supported_protocols") or []
        device_protocols: List[str] = d_specs.get("charging_protocols") or []

        if not charger_protocols or not device_protocols:
            ctx.add_check(
                check_id="power_protocol_negotiation",
                title="Power Delivery Protocol Negotiation",
                property_checked="charging_protocols",
                existing_value=device_protocols,
                candidate_value=charger_protocols,
                rule_applied="Host and charger must negotiate an interoperable fast-charging protocol (e.g. USB-PD / PPS)",
                outcome=CheckOutcome.CANNOT_VERIFY,
                severity=CheckSeverity.CRITICAL,
                explanation="Incomplete protocol specifications available for negotiation verification.",
            )
        else:
            # Check protocol overlap, e.g. "USB Power Delivery"
            common_pd = any(
                ("PD" in p.upper() or "POWER DELIVERY" in p.upper()) for p in charger_protocols
            ) and any(
                ("PD" in p.upper() or "POWER DELIVERY" in p.upper()) for p in device_protocols
            )

            if common_pd:
                ctx.add_check(
                    check_id="power_protocol_negotiation",
                    title="Power Delivery Protocol Negotiation",
                    property_checked="charging_protocols",
                    existing_value=device_protocols,
                    candidate_value=charger_protocols,
                    rule_applied="Both devices support standardized USB Power Delivery (USB-PD) handshake",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Both devices support USB Power Delivery standard for safe, voltage-negotiated charging.",
                )
            else:
                ctx.add_check(
                    check_id="power_protocol_negotiation",
                    title="Power Delivery Protocol Negotiation",
                    property_checked="charging_protocols",
                    existing_value=device_protocols,
                    candidate_value=charger_protocols,
                    rule_applied="Both devices must negotiate a shared power protocol",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.WARNING,
                    explanation=f"No shared fast-charging protocol found between charger ({charger_protocols}) and device ({device_protocols}). Device may charge at fallback baseline 5W.",
                )

        # 3. Wattage & Power Delivery Adequacy
        charger_max_w = c_specs.get("single_port_max_wattage_w") or c_specs.get("max_output_wattage_w")
        device_min_w = d_specs.get("min_recommended_charger_w")
        device_max_w = d_specs.get("max_charging_wattage_w")

        if charger_max_w is None or device_min_w is None:
            if charger_max_w is None:
                ctx.add_missing_spec(charger.id, charger.name, "max_output_wattage_w", "Wattage output rating unknown")
            if device_min_w is None:
                ctx.add_missing_spec(device.id, device.name, "min_recommended_charger_w", "Device required wattage unknown")
            ctx.add_check(
                check_id="power_wattage_sufficiency",
                title="Wattage & Power Delivery Capacity",
                property_checked="output_wattage_w",
                existing_value=f"Device recommended min: {device_min_w}W, max: {device_max_w}W",
                candidate_value=f"Charger max: {charger_max_w}W",
                rule_applied="Charger must supply at least the minimum operating wattage required by host device",
                outcome=CheckOutcome.CANNOT_VERIFY,
                severity=CheckSeverity.CRITICAL,
                explanation="Missing wattage metrics prevent quantitative power budget verification.",
            )
        else:
            charger_w = float(charger_max_w)
            dev_min_w = float(device_min_w)
            dev_max_w = float(device_max_w) if device_max_w is not None else dev_min_w

            if charger_w >= dev_max_w:
                ctx.add_check(
                    check_id="power_wattage_sufficiency",
                    title="Wattage & Power Delivery Capacity",
                    property_checked="output_wattage_w",
                    existing_value=f"{dev_max_w}W (max accepted)",
                    candidate_value=f"{charger_w}W (max output)",
                    rule_applied="Charger wattage equals or exceeds maximum charging acceptance rate",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Charger supplies {charger_w}W, fully saturating the device's maximum charging intake of {dev_max_w}W for optimal high-speed charging.",
                )
            elif charger_w >= dev_min_w:
                ctx.add_check(
                    check_id="power_wattage_sufficiency",
                    title="Wattage & Power Delivery Capacity",
                    property_checked="output_wattage_w",
                    existing_value=f"{dev_min_w}W (min recommended), {dev_max_w}W (max)",
                    candidate_value=f"{charger_w}W (max output)",
                    rule_applied="Charger wattage meets minimum operational requirement",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.INFO,
                    explanation=f"Charger supplies {charger_w}W. This satisfies the minimum {dev_min_w}W needed to run and charge, though below maximum potential {dev_max_w}W.",
                )
            else:
                ctx.add_check(
                    check_id="power_wattage_sufficiency",
                    title="Wattage & Power Delivery Capacity",
                    property_checked="output_wattage_w",
                    existing_value=f"{dev_min_w}W (min required)",
                    candidate_value=f"{charger_w}W (max output)",
                    rule_applied="Charger must supply at least the minimum operating wattage",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Charger max output ({charger_w}W) is insufficient for this device which requires at least {dev_min_w}W. Device will discharge under load or fail to charge.",
                )
