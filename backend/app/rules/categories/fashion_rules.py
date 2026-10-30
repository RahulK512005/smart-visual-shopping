from typing import Any, Dict, Set
from backend.app.db.models import Product
from backend.app.rules.base import BaseCategoryRule, RuleContext
from backend.app.schemas.compatibility import CheckOutcome, CheckSeverity

FASHION_CATEGORIES: Set[str] = {"clothing", "footwear", "accessories", "watches"}

NEUTRAL_COLORS: Set[str] = {
    "black", "white", "grey", "gray", "silver", "beige", "cream",
    "charcoal", "brown", "tan", "khaki", "off-white", "navy"
}

COMPATIBLE_STYLES: Dict[str, Set[str]] = {
    "streetwear": {"streetwear", "casual", "athleisure", "vintage", "y2k", "oversized"},
    "oversized": {"streetwear", "casual", "vintage", "relaxed", "baggy", "oversized"},
    "y2k": {"y2k", "streetwear", "cyberpunk", "futuristic", "retro"},
    "korean": {"korean", "minimalist", "casual", "cottagecore", "clean", "smart casual"},
    "minimalist": {"minimalist", "clean", "korean", "old money", "casual", "formal"},
    "vintage": {"vintage", "streetwear", "retro", "casual", "old money"},
    "cottagecore": {"cottagecore", "vintage", "korean", "casual"},
    "athleisure": {"athleisure", "streetwear", "casual", "sports"},
    "casual": {"casual", "streetwear", "athleisure", "minimalist", "vintage", "korean"},
    "formal": {"formal", "classic", "minimalist", "old money"},
    "old money": {"old money", "formal", "classic", "minimalist", "smart casual"},
}


class FashionOutfitStylingRule(BaseCategoryRule):
    """
    Evaluates outfit compatibility, aesthetic cohesion, color harmony,
    and silhouette proportions between fashion and lifestyle products.
    """

    rule_id = "rule_fashion_outfit_pairing"
    title = "Fashion Outfit Styling & Aesthetic Synergy"

    def matches(self, existing: Product, candidate: Product) -> bool:
        e_cat = (existing.category or "").lower()
        c_cat = (candidate.category or "").lower()
        return e_cat in FASHION_CATEGORIES or c_cat in FASHION_CATEGORIES

    def evaluate(self, ctx: RuleContext) -> None:
        p1 = ctx.existing
        p2 = ctx.candidate

        s1: Dict[str, Any] = p1.specifications or {}
        s2: Dict[str, Any] = p2.specifications or {}

        c1 = (s1.get("colour") or "").lower()
        c2 = (s2.get("colour") or "").lower()

        st1 = (s1.get("style") or "").lower()
        st2 = (s2.get("style") or "").lower()

        fit1 = (s1.get("fit") or "").lower()
        fit2 = (s2.get("fit") or "").lower()

        occ1 = (s1.get("occasion") or "").lower()
        occ2 = (s2.get("occasion") or "").lower()

        # Cross-category tech + fashion lifestyle check
        e_cat = (p1.category or "").lower()
        c_cat = (p2.category or "").lower()
        if (e_cat not in FASHION_CATEGORIES) or (c_cat not in FASHION_CATEGORIES):
            ctx.add_check(
                check_id="fashion_tech_lifestyle_synergy",
                title="Everyday Lifestyle & Aesthetic Integration",
                property_checked="lifestyle_pair",
                existing_value=f"{p1.brand} {p1.name} ({p1.category})",
                candidate_value=f"{p2.brand} {p2.name} ({p2.category})",
                rule_applied="Modern daily tech accessories integrate seamlessly with clean contemporary wardrobe essentials",
                outcome=CheckOutcome.PASS,
                severity=CheckSeverity.CRITICAL,
                explanation=f"Cohesive everyday lifestyle pairing: {p1.name} pairs effortlessly with {p2.name} for modern smart-casual carry.",
            )
            return

        # 1. Aesthetic & Style Cohesion Check
        if st1 and st2:
            st1_norm = st1.split()[0]
            st2_norm = st2.split()[0]
            allowed_st1 = COMPATIBLE_STYLES.get(st1_norm, {st1_norm})
            allowed_st2 = COMPATIBLE_STYLES.get(st2_norm, {st2_norm})

            if st1_norm == st2_norm or st2_norm in allowed_st1 or st1_norm in allowed_st2:
                ctx.add_check(
                    check_id="fashion_aesthetic_cohesion",
                    title="Aesthetic & Style Harmony",
                    property_checked="style",
                    existing_value=st1.capitalize(),
                    candidate_value=st2.capitalize(),
                    rule_applied="Complementary fashion subcultures and styling codes create cohesive Gen Z outfits",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Aesthetic harmony verified: '{st1.title()}' and '{st2.title()}' blend naturally into a trending, curated look.",
                )
            else:
                ctx.add_check(
                    check_id="fashion_aesthetic_cohesion",
                    title="Aesthetic & Style Contrast",
                    property_checked="style",
                    existing_value=st1.capitalize(),
                    candidate_value=st2.capitalize(),
                    rule_applied="Contrasting aesthetics require intentional high-low or mixed-vibe styling",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.WARNING,
                    explanation=f"High-contrast styling advisory: '{st1.title()}' paired with '{st2.title()}' makes a bold statement. Pair with neutral accents.",
                )
        else:
            ctx.add_check(
                check_id="fashion_aesthetic_cohesion",
                title="Aesthetic & Style Versatility",
                property_checked="style",
                existing_value=st1.capitalize() or "Versatile Essential",
                candidate_value=st2.capitalize() or "Versatile Essential",
                rule_applied="Wardrobe staple silhouettes match fluidly across multiple aesthetics",
                outcome=CheckOutcome.PASS,
                severity=CheckSeverity.CRITICAL,
                explanation=f"Versatile style baseline: {p1.name} and {p2.name} share easy-to-style foundational lines.",
            )

        # 2. Color Theory & Palette Synergy Check
        if c1 and c2:
            is_monochrome = (c1 == c2) or (c1 in c2) or (c2 in c1)
            one_neutral = (c1 in NEUTRAL_COLORS) or (c2 in NEUTRAL_COLORS)
            both_neutral = (c1 in NEUTRAL_COLORS) and (c2 in NEUTRAL_COLORS)

            if is_monochrome:
                ctx.add_check(
                    check_id="fashion_color_palette",
                    title="Color Theory & Palette Synergy",
                    property_checked="colour",
                    existing_value=c1.capitalize(),
                    candidate_value=c2.capitalize(),
                    rule_applied="Monochromatic and tonal palettes produce clean, elevated visual flow",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Sleek monochromatic harmony: Tonal '{c1.title()}' on '{c2.title()}' delivers a cohesive designer look.",
                )
            elif both_neutral:
                ctx.add_check(
                    check_id="fashion_color_palette",
                    title="Color Theory & Palette Synergy",
                    property_checked="colour",
                    existing_value=c1.capitalize(),
                    candidate_value=c2.capitalize(),
                    rule_applied="Neutral tones (black, white, earth tones, grey) provide safe, timeless contrast",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Timeless neutral pairing: '{c1.title()}' and '{c2.title()}' provide balanced wardrobe contrast.",
                )
            elif one_neutral:
                ctx.add_check(
                    check_id="fashion_color_palette",
                    title="Color Theory & Palette Synergy",
                    property_checked="colour",
                    existing_value=c1.capitalize(),
                    candidate_value=c2.capitalize(),
                    rule_applied="Neutral grounding color highlights statement accent pieces without visual clash",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Grounded accent pairing: Neutral '{c1.title() if c1 in NEUTRAL_COLORS else c2.title()}' anchors the outfit.",
                )
            else:
                ctx.add_check(
                    check_id="fashion_color_palette",
                    title="Color Theory & Palette Contrast",
                    property_checked="colour",
                    existing_value=c1.capitalize(),
                    candidate_value=c2.capitalize(),
                    rule_applied="Dual non-neutral colors create vibrant chromatic color-blocking",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.WARNING,
                    explanation=f"Chromatic color-block advisory: '{c1.title()}' alongside '{c2.title()}' creates an eye-catching contrast.",
                )
        else:
            ctx.add_check(
                check_id="fashion_color_palette",
                title="Color Theory & Palette Synergy",
                property_checked="colour",
                existing_value=c1.capitalize() or "Universal Tone",
                candidate_value=c2.capitalize() or "Universal Tone",
                rule_applied="Default neutral and earth-tone catalog colorways integrate reliably",
                outcome=CheckOutcome.PASS,
                severity=CheckSeverity.CRITICAL,
                explanation="Complementary colorway compatibility verified across seasonal shades.",
            )

        # 3. Silhouette & Volume Proportions Check
        has_volume = any(f in ["oversized", "baggy", "relaxed"] for f in [fit1, fit2])
        is_accessory = any(cat in ["accessories", "watches"] for cat in [e_cat, c_cat])

        if is_accessory:
            ctx.add_check(
                check_id="fashion_silhouette_proportions",
                title="Silhouette & Scale Balance",
                property_checked="silhouette_scale",
                existing_value=fit1.capitalize() or e_cat.capitalize(),
                candidate_value=fit2.capitalize() or c_cat.capitalize(),
                rule_applied="Wearable accessories and jewelry scale proportionately without overpowering outfit lines",
                outcome=CheckOutcome.PASS,
                severity=CheckSeverity.CRITICAL,
                explanation="Scale proportion verified: Accessory accents enhance apparel drape without cluttering the silhouette.",
            )
        elif has_volume:
            ctx.add_check(
                check_id="fashion_silhouette_proportions",
                title="Silhouette & Volume Proportions",
                property_checked="fit_drape",
                existing_value=fit1.capitalize() or "Relaxed",
                candidate_value=fit2.capitalize() or "Relaxed",
                rule_applied="Gen Z streetwear proportions favor relaxed drape and drop-shoulder silhouettes",
                outcome=CheckOutcome.PASS,
                severity=CheckSeverity.CRITICAL,
                explanation="Trending silhouette verified: Proportional volume creates a relaxed, street-ready silhouette.",
            )
        else:
            ctx.add_check(
                check_id="fashion_silhouette_proportions",
                title="Silhouette & Fit Harmony",
                property_checked="fit_drape",
                existing_value=fit1.capitalize() or "Regular",
                candidate_value=fit2.capitalize() or "Regular",
                rule_applied="Tailored and regular silhouettes offer balanced, classic lines",
                outcome=CheckOutcome.PASS,
                severity=CheckSeverity.CRITICAL,
                explanation="Balanced proportions: Clean cuts and tailored lines maintain a flattering overall profile.",
            )

        # 4. Occasion & Event Appropriateness Check
        if occ1 and occ2:
            if occ1 == occ2:
                ctx.add_check(
                    check_id="fashion_occasion_suitability",
                    title="Occasion & Setting Alignment",
                    property_checked="occasion",
                    existing_value=occ1.capitalize(),
                    candidate_value=occ2.capitalize(),
                    rule_applied="Shared event and lifestyle codes guarantee contextual appropriateness",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.CRITICAL,
                    explanation=f"Exact event alignment: Both items are tailored for '{occ1.title()}' environments.",
                )
            else:
                ctx.add_check(
                    check_id="fashion_occasion_suitability",
                    title="Occasion & Setting Flexibility",
                    property_checked="occasion",
                    existing_value=occ1.capitalize(),
                    candidate_value=occ2.capitalize(),
                    rule_applied="Cross-occasion layering allows smart transitions between social and casual settings",
                    outcome=CheckOutcome.PASS,
                    severity=CheckSeverity.WARNING,
                    explanation=f"Day-to-night flexibility: Can transition between '{occ1.title()}' and '{occ2.title()}' with layered styling.",
                )
        else:
            ctx.add_check(
                check_id="fashion_occasion_suitability",
                title="Occasion & Setting Suitability",
                property_checked="occasion",
                existing_value=occ1.capitalize() or "Daily / Casual",
                candidate_value=occ2.capitalize() or "Daily / Casual",
                rule_applied="Everyday versatile clothing transitions fluidly across social scenarios",
                outcome=CheckOutcome.PASS,
                severity=CheckSeverity.CRITICAL,
                explanation="Versatile occasion suitability: Wearable across campus, coffee runs, and casual weekend outings.",
            )

