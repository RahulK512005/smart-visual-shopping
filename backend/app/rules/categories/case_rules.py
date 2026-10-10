from typing import Any, Dict
from backend.app.db.models import Product
from backend.app.rules.base import BaseCategoryRule, RuleContext
from backend.app.schemas.compatibility import CheckOutcome, CheckSeverity


class ProtectiveCaseCompatibilityRule(BaseCategoryRule):
    """
    Evaluates physical fit and model precision between protective cases and smartphones.
    """

    rule_id = "rule_protective_case"
    title = "Form Factor & Device Model Fit"

    def matches(self, existing: Product, candidate: Product) -> bool:
        cats = {existing.category.lower(), candidate.category.lower()}
        return "case" in cats and any(c in cats for c in ["smartphone", "tablet"])

    def evaluate(self, ctx: RuleContext) -> None:
        if ctx.existing.category.lower() == "case":
            case = ctx.existing
            device = ctx.candidate
        else:
            device = ctx.existing
            case = ctx.candidate

        c_specs: Dict[str, Any] = case.specifications or {}
        d_specs: Dict[str, Any] = device.specifications or {}

        # 1. Target Device Model Alignment
        case_target_model = str(c_specs.get("target_device_model") or "").strip().lower()
        device_model = str(device.model or "").strip().lower()

        if not case_target_model:
            ctx.add_missing_spec(case.id, case.name, "target_device_model", "Case supported target model unspecified")
            ctx.add_check(
                check_id="case_model_match",
                title="Exact Device Model Fit",
                property_checked="target_device_model",
                existing_value=device.model,
                candidate_value=c_specs.get("target_device_model"),
                rule_applied="Protective cases require exact chassis model alignment for ports and camera cutouts",
                outcome=CheckOutcome.CANNOT_VERIFY,
                severity=CheckSeverity.CRITICAL,
                explanation="Missing target device specification on case to verify chassis fit.",
            )
        else:
            if case_target_model == device_model or case_target_model in device.name.lower():
                ctx.add_check(
                    check_id="case_model_match",
                    title="Exact Device Model Fit",
                    property_checked="target_device_model",
                    existing_value=device.model,
                    candidate_value=c_specs.get("target_device_model"),
                    rule_applied="Case model matches target smartphone model precisely",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Exact model match confirmed: Case is engineered specifically for {device.name}.",
                )
            else:
                ctx.add_check(
                    check_id="case_model_match",
                    title="Exact Device Model Fit",
                    property_checked="target_device_model",
                    existing_value=device.model,
                    candidate_value=c_specs.get("target_device_model"),
                    rule_applied="Case model must match target smartphone model",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Chassis mismatch: Case is designed for '{c_specs.get('target_device_model')}', which will not fit {device.name} due to camera bump, button, and dimension differences.",
                )

        # 2. Dimensions check
        case_dims = c_specs.get("form_factor_dimensions_mm")
        dev_dims = d_specs.get("dimensions_mm")
        if case_dims and dev_dims and isinstance(case_dims, dict) and isinstance(dev_dims, dict):
            h_diff = abs(float(case_dims.get("height", 0)) - float(dev_dims.get("height", 0)))
            w_diff = abs(float(case_dims.get("width", 0)) - float(dev_dims.get("width", 0)))
            if h_diff < 1.0 and w_diff < 1.0:
                ctx.add_check(
                    check_id="case_dimensions_tolerance",
                    title="Chassis Dimension Tolerance",
                    property_checked="dimensions_mm",
                    existing_value=dev_dims,
                    candidate_value=case_dims,
                    rule_applied="Chassis dimensions within 1.0mm tolerance",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Physical dimensions match within sub-millimeter precision (Height delta: {h_diff:.1f}mm, Width delta: {w_diff:.1f}mm).",
                )
            else:
                ctx.add_check(
                    check_id="case_dimensions_tolerance",
                    title="Chassis Dimension Tolerance",
                    property_checked="dimensions_mm",
                    existing_value=dev_dims,
                    candidate_value=case_dims,
                    rule_applied="Chassis dimensions within 1.0mm tolerance",
                    outcome=CheckOutcome.FAIL,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Physical dimension variance exceeds tolerance (Height delta: {h_diff:.1f}mm, Width delta: {w_diff:.1f}mm). Case will not snap onto device.",
                )
