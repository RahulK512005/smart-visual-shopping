from typing import List, Optional
from backend.app.db.models import Product
from backend.app.rules.base import BaseCategoryRule, RuleContext
from backend.app.rules.categories.power_rules import ChargerDevicePowerRule
from backend.app.rules.categories.cable_rules import CableDeviceCompatibilityRule
from backend.app.rules.categories.display_rules import DisplayDeviceCompatibilityRule
from backend.app.rules.categories.wearable_rules import WearablePhoneCompatibilityRule
from backend.app.rules.categories.case_rules import ProtectiveCaseCompatibilityRule
from backend.app.rules.categories.audio_rules import AudioDeviceCompatibilityRule
from backend.app.rules.categories.fashion_rules import FashionOutfitStylingRule
from backend.app.schemas.compatibility import CheckOutcome, CheckSeverity


class CompatibilityRuleRegistry:
    def __init__(self):
        self._rules: List[BaseCategoryRule] = [
            FashionOutfitStylingRule(),
            ChargerDevicePowerRule(),
            CableDeviceCompatibilityRule(),
            DisplayDeviceCompatibilityRule(),
            WearablePhoneCompatibilityRule(),
            ProtectiveCaseCompatibilityRule(),
            AudioDeviceCompatibilityRule(),
        ]

    def register(self, rule: BaseCategoryRule) -> None:
        self._rules.append(rule)

    def find_matching_rules(self, existing: Product, candidate: Product) -> List[BaseCategoryRule]:
        return [rule for rule in self._rules if rule.matches(existing, candidate)]

    def evaluate_unmatched(self, ctx: RuleContext) -> None:
        """
        Fallback evaluation when no category-specific rule explicitly matches the pair.
        Avoids naive universal guesses: flags missing domain rules and marks cannot_verify.
        """
        e_cat = ctx.existing.category
        c_cat = ctx.candidate.category

        if e_cat == c_cat:
            # Same category items (e.g. comparing two smartphones or two laptops)
            ctx.add_check(
                check_id="generic_same_category",
                title="Direct Product Functional Relationship",
                property_checked="category",
                existing_value=e_cat,
                candidate_value=c_cat,
                rule_applied="Products in the identical category are alternative options rather than functional accessories",
                outcome=CheckOutcome.CANNOT_VERIFY,
                severity=CheckSeverity.WARNING,
                explanation=f"Both items are '{e_cat}' products. Compatibility evaluation applies to host-accessory or interconnect pairs.",
            )
        else:
            ctx.add_check(
                check_id="generic_unknown_category_pair",
                title="Category Interoperability Rules",
                property_checked="category_pair",
                existing_value=e_cat,
                candidate_value=c_cat,
                rule_applied="Category-specific deterministic rule required for verification",
                outcome=CheckOutcome.CANNOT_VERIFY,
                severity=CheckSeverity.CRITICAL,
                explanation=f"No certified deterministic rules found to evaluate interoperability between '{e_cat}' and '{c_cat}'.",
            )


rule_registry = CompatibilityRuleRegistry()
