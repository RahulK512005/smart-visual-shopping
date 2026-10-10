from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from backend.app.db.models import Product
from backend.app.schemas.compatibility import CheckItem, CheckOutcome, CheckSeverity, MissingSpecificationItem


class RuleContext:
    def __init__(self, existing: Product, candidate: Product, user_context: Optional[Dict[str, Any]] = None):
        self.existing = existing
        self.candidate = candidate
        self.user_context = user_context or {}
        self.checks: List[CheckItem] = []
        self.missing_specs: List[MissingSpecificationItem] = []

    def add_check(
        self,
        check_id: str,
        title: str,
        property_checked: str,
        existing_value: Any,
        candidate_value: Any,
        rule_applied: str,
        outcome: CheckOutcome,
        explanation: str,
        severity: CheckSeverity = CheckSeverity.CRITICAL,
        evidence: Optional[str] = None,
        verification_status: Optional[str] = None,
    ):
        self.checks.append(
            CheckItem(
                check_id=check_id,
                title=title,
                property_checked=property_checked,
                existing_value=existing_value,
                candidate_value=candidate_value,
                rule_applied=rule_applied,
                outcome=outcome,
                severity=severity,
                explanation=explanation,
                evidence=evidence or self.candidate.spec_source or self.existing.spec_source,
                verification_status=verification_status or self.candidate.verification_status,
            )
        )

    def add_missing_spec(self, product_id: str, product_name: str, property_name: str, impact_reason: str):
        self.missing_specs.append(
            MissingSpecificationItem(
                product_id=product_id,
                product_name=product_name,
                missing_property=property_name,
                impact_reason=impact_reason,
            )
        )


class BaseCategoryRule(ABC):
    """Abstract base class for deterministic category-specific compatibility rules."""

    @property
    @abstractmethod
    def rule_id(self) -> str:
        pass

    @property
    @abstractmethod
    def title(self) -> str:
        pass

    @abstractmethod
    def matches(self, existing: Product, candidate: Product) -> bool:
        """Determines if this rule applies to the given pair of products."""
        pass

    @abstractmethod
    def evaluate(self, ctx: RuleContext) -> None:
        """Executes the specific compatibility checks against the products."""
        pass
