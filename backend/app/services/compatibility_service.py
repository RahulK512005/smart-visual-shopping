from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from backend.app.db.models import Product
from backend.app.db.repositories.product_repo import ProductRepository
from backend.app.core.errors import ProductNotFoundError
from backend.app.rules.base import RuleContext
from backend.app.rules.registry import rule_registry
from backend.app.schemas.compatibility import (
    CheckOutcome,
    CheckSeverity,
    CompatibilityCheckResponse,
    CompatibilityVerdict,
    ProductSummary,
)

FASHION_CATS = {"clothing", "footwear", "accessories", "watches"}


class CompatibilityService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProductRepository(db)

    def evaluate(
        self,
        existing_product_id: str,
        candidate_product_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> CompatibilityCheckResponse:
        # Retrieve both products
        existing = self.repo.get_by_id(existing_product_id)
        if not existing:
            raise ProductNotFoundError(existing_product_id)

        candidate = self.repo.get_by_id(candidate_product_id)
        if not candidate:
            raise ProductNotFoundError(candidate_product_id)

        # Run rules engine
        rule_ctx = RuleContext(existing=existing, candidate=candidate, user_context=context)

        matching_rules = rule_registry.find_matching_rules(existing, candidate)
        if matching_rules:
            for rule in matching_rules:
                rule.evaluate(rule_ctx)
        else:
            rule_registry.evaluate_unmatched(rule_ctx)

        # Partition checks
        passed_checks = [c for c in rule_ctx.checks if c.outcome == CheckOutcome.PASS]
        failed_checks = [c for c in rule_ctx.checks if c.outcome == CheckOutcome.FAIL]
        cannot_verify_checks = [c for c in rule_ctx.checks if c.outcome == CheckOutcome.CANNOT_VERIFY]

        # Determine verdict deterministically
        has_critical_failure = any(c.severity == CheckSeverity.CRITICAL for c in failed_checks)
        has_critical_unverified = any(c.severity == CheckSeverity.CRITICAL for c in cannot_verify_checks)

        is_fashion = any(
            (p.category or "").lower() in FASHION_CATS
            for p in [existing, candidate]
        )

        if has_critical_failure:
            verdict = CompatibilityVerdict.INCOMPATIBLE
            fail_reasons = [f"- {c.title}: {c.explanation}" for c in failed_checks if c.severity == CheckSeverity.CRITICAL]
            if is_fashion:
                summary_explanation = (
                    f"⚠️ Style Clashing: {candidate.name} does not harmonize well with {existing.name}.\n"
                    + "\n".join(fail_reasons)
                )
            else:
                summary_explanation = (
                    f"Incompatible: {candidate.name} is not compatible with {existing.name}.\n"
                    + "\n".join(fail_reasons)
                )
        elif has_critical_unverified:
            verdict = CompatibilityVerdict.CANNOT_VERIFY
            unverified_reasons = [f"- {c.title}: {c.explanation}" for c in cannot_verify_checks if c.severity == CheckSeverity.CRITICAL]
            summary_explanation = (
                f"Cannot verify compatibility between {candidate.name} and {existing.name} due to unverified or missing technical specifications.\n"
                + "\n".join(unverified_reasons)
            )
        else:
            if failed_checks:  # Only non-critical warnings
                verdict = CompatibilityVerdict.PARTIALLY_COMPATIBLE
                warning_notes = [f"- {c.title}: {c.explanation}" for c in failed_checks]
                if is_fashion:
                    summary_explanation = (
                        f"✨ High-Contrast Pairing: {candidate.name} styles with {existing.name} with intentional creative contrast.\n"
                        + "\n".join(warning_notes)
                    )
                else:
                    summary_explanation = (
                        f"Partly compatible: {candidate.name} works with {existing.name} with performance advisories.\n"
                        + "\n".join(warning_notes)
                    )
            else:
                verdict = CompatibilityVerdict.COMPATIBLE
                if is_fashion:
                    summary_explanation = (
                        f"🔥 Iconic Outfit Match: {candidate.name} and {existing.name} achieve aesthetic, palette, and silhouette harmony. Ready to wear together."
                    )
                else:
                    summary_explanation = (
                        f"Fully compatible: {candidate.name} satisfies all hardware, protocol, and interface requirements for {existing.name}."
                    )

        return CompatibilityCheckResponse(
            existing_product=ProductSummary(
                id=existing.id,
                name=existing.name,
                brand=existing.brand,
                model=existing.model,
                category=existing.category,
                image_url=existing.image_url,
                spec_source=existing.spec_source,
                verification_status=existing.verification_status,
            ),
            candidate_product=ProductSummary(
                id=candidate.id,
                name=candidate.name,
                brand=candidate.brand,
                model=candidate.model,
                category=candidate.category,
                image_url=candidate.image_url,
                spec_source=candidate.spec_source,
                verification_status=candidate.verification_status,
            ),
            verdict=verdict,
            summary_explanation=summary_explanation,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            cannot_verify_checks=cannot_verify_checks,
            missing_specifications=rule_ctx.missing_specs,
        )
