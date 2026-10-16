from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CompatibilityVerdict(str, Enum):
    COMPATIBLE = "compatible"
    PARTIALLY_COMPATIBLE = "partially_compatible"
    INCOMPATIBLE = "incompatible"
    CANNOT_VERIFY = "cannot_verify"



class CheckOutcome(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    CANNOT_VERIFY = "cannot_verify"


class CheckSeverity(str, Enum):
    CRITICAL = "critical"  # Causes incompatibility if fails
    WARNING = "warning"    # Advisory, e.g. charges slower or lacks fast charging
    INFO = "info"


class CompatibilityCheckRequest(BaseModel):
    existing_product_id: str = Field(..., description="Stable ID of user's current existing product")
    candidate_product_id: str = Field(..., description="Stable ID of the candidate product to evaluate for compatibility")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional evaluation context, e.g. cable type, operating system version")


class CheckItem(BaseModel):
    check_id: str = Field(..., description="Unique rule/check identifier")
    title: str = Field(..., description="Human-readable title of the check")
    property_checked: str = Field(..., description="Attribute or specification evaluated")
    existing_value: Optional[Any] = Field(None, description="Observed value on existing product")
    candidate_value: Optional[Any] = Field(None, description="Observed value on candidate product")
    rule_applied: str = Field(..., description="Specific deterministic rule or standard applied")
    outcome: CheckOutcome = Field(..., description="Result of this individual check (pass, fail, cannot_verify)")
    severity: CheckSeverity = Field(default=CheckSeverity.CRITICAL, description="Severity of failure")
    explanation: str = Field(..., description="Clear human-readable explanation of why this check passed, failed, or cannot be verified")
    evidence: Optional[str] = Field(None, description="Citation or datasheet source reference")
    verification_status: Optional[str] = Field(None, description="Verification status of the underlying specifications")


class MissingSpecificationItem(BaseModel):
    product_id: str
    product_name: str
    missing_property: str
    impact_reason: str


class ProductSummary(BaseModel):
    id: str
    name: str
    brand: str
    model: str
    category: str
    image_url: str
    spec_source: Optional[str] = None
    verification_status: str


class CompatibilityCheckResponse(BaseModel):
    existing_product: ProductSummary
    candidate_product: ProductSummary
    verdict: CompatibilityVerdict = Field(..., description="Final deterministic compatibility verdict: compatible | incompatible | cannot_verify")
    summary_explanation: str = Field(..., description="High-level human-readable verdict rationale")
    passed_checks: List[CheckItem] = Field(default_factory=list)
    failed_checks: List[CheckItem] = Field(default_factory=list)
    cannot_verify_checks: List[CheckItem] = Field(default_factory=list)
    missing_specifications: List[MissingSpecificationItem] = Field(default_factory=list)
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
