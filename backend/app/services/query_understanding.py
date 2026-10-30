"""
Fashion Natural Language Query Understanding Service.
Extracts structured search parameters (category, subcategory, colour, style,
brand, price constraints, gender, occasion, material) and produces a cleansed
semantic text query for FashionCLIP text-to-image embedding retrieval.
Deterministic, fast, robust, and requires no external LLM dependencies.
"""
import re
from typing import Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field

from backend.app.core.logging import logger

# ─────────────────────────────────────────────────────────────
# TAXONOMY & KEYWORD DICTIONARIES
# ─────────────────────────────────────────────────────────────

CATEGORY_TAXONOMY: Dict[str, List[str]] = {
    "clothing": [
        "clothing", "clothes", "apparel", "wear", "outfit", "outfits", "dress", "dresses",
        "t-shirt", "tshirt", "t-shirts", "tshirts", "tee", "tees", "shirt", "shirts",
        "jeans", "denim", "trouser", "trousers", "pants", "chinos", "skirt", "skirts",
        "jacket", "jackets", "hoodie", "hoodies", "sweater", "sweaters", "coat", "coats",
        "ethnic wear", "kurta", "saree", "ethnic", "top", "tops", "shorts", "blazer"
    ],
    "footwear": [
        "footwear", "shoes", "shoe", "sneakers", "sneaker", "kicks", "sports shoes",
        "running shoes", "formal shoes", "oxford", "loafers", "loafer", "sandals",
        "sandal", "boots", "boot", "heels", "heel", "slippers", "slides", "flats"
    ],
    "watches": [
        "watches", "watch", "timepiece", "timepieces", "analog watch", "digital watch",
        "smartwatch", "smartwatches", "luxury watch", "chronograph", "wrist watch"
    ],
    "accessories": [
        "accessories", "accessory", "bag", "bags", "handbag", "handbags", "tote", "totes",
        "backpack", "backpacks", "wallet", "wallets", "sunglasses", "shades", "eyewear",
        "jewellery", "jewelry", "necklace", "ring", "rings", "bracelet", "earrings",
        "belt", "belts", "cap", "caps", "hat", "hats", "beanie"
    ]
}

SUBCATEGORY_MAP: Dict[str, str] = {
    "t-shirt": "t-shirt", "tshirt": "t-shirt", "t-shirts": "t-shirt", "tee": "t-shirt", "tees": "t-shirt",
    "shirt": "shirt", "shirts": "shirt", "button-down": "shirt",
    "jeans": "jeans", "denim": "jeans",
    "trouser": "trouser", "trousers": "trouser", "pants": "trouser", "chinos": "trouser",
    "dress": "dress", "dresses": "dress", "gown": "dress",
    "skirt": "skirt", "skirts": "skirt",
    "jacket": "jacket", "jackets": "jacket", "blazer": "jacket", "coat": "jacket",
    "hoodie": "hoodie", "hoodies": "hoodie", "sweatshirt": "hoodie",
    "ethnic wear": "ethnic wear", "kurta": "ethnic wear", "saree": "ethnic wear",
    "sneakers": "sneakers", "sneaker": "sneakers", "kicks": "sneakers",
    "sports shoes": "sports shoes", "running shoes": "sports shoes",
    "formal shoes": "formal shoes", "oxford": "formal shoes", "loafers": "formal shoes",
    "sandals": "sandals", "sandal": "sandals", "slides": "sandals",
    "boots": "boots", "boot": "boots", "chelsea": "boots",
    "heels": "heels", "heel": "heels", "pumps": "heels",
    "analog watch": "analog watch", "analog": "analog watch",
    "smartwatch": "smartwatch", "smart watch": "smartwatch",
    "digital watch": "digital watch", "digital": "digital watch",
    "luxury watch": "luxury watch", "chronograph": "luxury watch",
    "bag": "bag", "bags": "bag", "tote": "bag",
    "handbag": "handbag", "handbags": "handbag", "purse": "handbag",
    "backpack": "backpack", "backpacks": "backpack",
    "wallet": "wallet", "wallets": "wallet",
    "sunglasses": "sunglasses", "shades": "sunglasses", "eyewear": "sunglasses",
    "jewellery": "jewellery", "jewelry": "jewellery", "necklace": "jewellery", "ring": "jewellery",
    "belt": "belt", "belts": "belt",
    "cap": "cap", "caps": "cap", "hat": "cap", "beanie": "cap"
}

COLOURS: List[str] = [
    "black", "white", "blue", "navy", "green", "olive", "red", "maroon",
    "brown", "beige", "tan", "cream", "pink", "purple", "yellow", "orange",
    "grey", "gray", "silver", "gold", "khaki", "burgundy", "charcoal", "off-white"
]

STYLES: Dict[str, str] = {
    "streetwear": "streetwear",
    "old money": "old money",
    "quiet luxury": "old money",
    "y2k": "y2k",
    "2000s": "y2k",
    "minimalist": "minimalist",
    "minimal": "minimalist",
    "casual": "casual",
    "formal": "formal",
    "vintage": "vintage",
    "retro": "vintage",
    "athleisure": "athleisure",
    "sporty": "athleisure",
    "athletic": "athleisure",
    "korean fashion": "korean fashion",
    "korean": "korean fashion",
    "k-fashion": "korean fashion",
    "korean-style": "korean fashion",
    "luxury": "luxury",
    "designer": "luxury",
    "oversized": "oversized",
    "baggy": "oversized",
    "boxy": "oversized"
}

GENDERS: Dict[str, str] = {
    "men": "men", "mens": "men", "men's": "men", "male": "men", "guy": "men", "guys": "men",
    "women": "women", "womens": "women", "women's": "women", "female": "women", "girl": "women", "girls": "women", "ladies": "women",
    "unisex": "unisex"
}

OCCASIONS: Dict[str, str] = {
    "college": "college", "campus": "college", "university": "college",
    "casual": "casual", "daily": "casual", "everyday": "casual", "day-to-day": "casual",
    "formal": "formal", "office": "formal", "work": "formal", "business": "formal",
    "party": "party", "club": "party", "nightout": "party", "evening": "party",
    "summer": "summer", "winter": "winter", "sports": "sports", "gym": "sports", "workout": "sports"
}

MATERIALS: List[str] = [
    "leather", "cotton", "linen", "denim", "silk", "wool", "velvet",
    "canvas", "suede", "mesh", "polyester", "nylon", "fleece", "knit"
]

BRANDS: List[str] = [
    "urban monkey", "nike", "adidas", "zara", "h&m", "puma", "massimo dutti",
    "uniqlo", "casio", "titan", "fossil", "tissot", "ray-ban", "gucci",
    "prada", "balenciaga", "new balance", "converse", "vans", "apple",
    "levis", "levi's", "tommy hilfiger", "calvin klein", "under armour"
]


class ExtractedFashionQuery(BaseModel):
    """Structured representation of understood natural-language fashion search query."""
    raw_query: str
    query_text: str = Field(description="Semantic keywords optimized for FashionCLIP text embedding")
    category: Optional[str] = None
    subcategory: Optional[str] = None
    colour: Optional[str] = None
    style: Optional[str] = None
    brand: Optional[str] = None
    gender: Optional[str] = None
    occasion: Optional[str] = None
    material: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None


class FashionQueryUnderstandingService:
    """Deterministic parser extracting fashion entities and structured filters from natural text."""

    def __init__(self):
        # Compile price patterns (handling INR ₹, Rs, Rs., USD $, EUR €, and plain digits)
        self.under_price_re = re.compile(
            r'(?:under|below|less than|within|cheaper than|up to|max(?:imum)?)\s*(?:[₹$€]|rs\.?|inr)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)',
            re.IGNORECASE
        )
        self.above_price_re = re.compile(
            r'(?:above|over|more than|exceeding|min(?:imum)?|at least)\s*(?:[₹$€]|rs\.?|inr)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)',
            re.IGNORECASE
        )
        self.between_price_re = re.compile(
            r'(?:between|from)\s*(?:[₹$€]|rs\.?|inr)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:and|to|-)\s*(?:[₹$€]|rs\.?|inr)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)',
            re.IGNORECASE
        )

    def parse_query(self, query: str) -> ExtractedFashionQuery:
        """
        Parses user's natural language input into structured filters and FashionCLIP semantic query text.
        """
        clean_input = (query or "").strip()
        if not clean_input:
            return ExtractedFashionQuery(raw_query="", query_text="")

        normalized = clean_input.lower()
        min_price: Optional[float] = None
        max_price: Optional[float] = None

        # 1. Price extraction
        between_match = self.between_price_re.search(normalized)
        if between_match:
            try:
                min_price = float(between_match.group(1).replace(",", ""))
                max_price = float(between_match.group(2).replace(",", ""))
                normalized = self.between_price_re.sub(" ", normalized)
            except ValueError:
                pass

        if max_price is None:
            under_match = self.under_price_re.search(normalized)
            if under_match:
                try:
                    max_price = float(under_match.group(1).replace(",", ""))
                    normalized = self.under_price_re.sub(" ", normalized)
                except ValueError:
                    pass

        if min_price is None:
            above_match = self.above_price_re.search(normalized)
            if above_match:
                try:
                    min_price = float(above_match.group(1).replace(",", ""))
                    normalized = self.above_price_re.sub(" ", normalized)
                except ValueError:
                    pass

        # 2. Brand extraction
        detected_brand: Optional[str] = None
        for b in sorted(BRANDS, key=len, reverse=True):
            pattern = r'\b' + re.escape(b) + r'\b'
            if re.search(pattern, normalized):
                detected_brand = b.title()
                normalized = re.sub(pattern, " ", normalized)
                break

        # 3. Category & Subcategory extraction
        detected_category: Optional[str] = None
        detected_subcategory: Optional[str] = None

        # Check explicit watches / footwear / accessories first before broad terms like 'outfit'
        if re.search(r'\b(?:watches|watch|timepiece|timepieces|smartwatch)\b', normalized):
            detected_category = "watches"
        elif re.search(r'\b(?:shoes|shoe|sneakers|sneaker|boots|boot|sandals|sandal|heels|heel|footwear)\b', normalized):
            detected_category = "footwear"
        elif re.search(r'\b(?:bag|bags|handbag|handbags|backpack|backpacks|wallet|wallets|sunglasses|jewellery|jewelry|belt|belts|cap|caps|accessories|accessory)\b', normalized):
            detected_category = "accessories"

        # Subcategories
        for sub_term, std_sub in sorted(SUBCATEGORY_MAP.items(), key=lambda x: len(x[0]), reverse=True):
            pattern = r'\b' + re.escape(sub_term) + r'\b'
            if re.search(pattern, normalized):
                detected_subcategory = std_sub
                if not detected_category:
                    for cat, terms in CATEGORY_TAXONOMY.items():
                        if sub_term in terms or std_sub in terms:
                            detected_category = cat
                            break
                break

        # Category if not yet resolved
        if not detected_category:
            for cat, terms in CATEGORY_TAXONOMY.items():
                for term in terms:
                    pattern = r'\b' + re.escape(term) + r'\b'
                    if re.search(pattern, normalized):
                        detected_category = cat
                        break
                if detected_category:
                    break

        # 4. Colour extraction
        detected_colour: Optional[str] = None
        for col in sorted(COLOURS, key=len, reverse=True):
            pattern = r'\b' + re.escape(col) + r'\b'
            if re.search(pattern, normalized):
                detected_colour = col
                break

        # 5. Style extraction
        detected_style: Optional[str] = None
        for st_term, std_style in sorted(STYLES.items(), key=lambda x: len(x[0]), reverse=True):
            pattern = r'\b' + re.escape(st_term) + r'\b'
            if re.search(pattern, normalized):
                detected_style = std_style
                break

        # 6. Gender extraction
        detected_gender: Optional[str] = None
        for g_term, std_gender in GENDERS.items():
            pattern = r'\b' + re.escape(g_term) + r'\b'
            if re.search(pattern, normalized):
                detected_gender = std_gender
                break

        # 7. Occasion extraction
        detected_occasion: Optional[str] = None
        for occ_term, std_occ in OCCASIONS.items():
            pattern = r'\b' + re.escape(occ_term) + r'\b'
            if re.search(pattern, normalized):
                detected_occasion = std_occ
                break

        # 8. Material extraction
        detected_material: Optional[str] = None
        for mat in MATERIALS:
            pattern = r'\b' + re.escape(mat) + r'\b'
            if re.search(pattern, normalized):
                detected_material = mat
                break

        # 9. Cleanse query text for FashionCLIP
        # Strip conversational filler words ("find", "show me", "suggest", "look for", "similar to", "please")
        filler_re = re.compile(
            r'\b(?:show(?:\s+me)?|find(?:\s+me)?|search(?:\s+for)?|suggest(?:\s+me)?|looking(?:\s+for)?|give(?:\s+me)?|want|need|get|for|with|in|a|an|the|of|to|some)\b',
            re.IGNORECASE
        )
        cleaned_text = filler_re.sub(" ", normalized)
        cleaned_text = re.sub(r'[^a-zA-Z0-9\s\-]', ' ', cleaned_text)
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()

        # If cleansing stripped everything, fall back to cleaned raw query
        if not cleaned_text:
            cleaned_text = re.sub(r'\s+', ' ', re.sub(r'[^a-zA-Z0-9\s\-]', ' ', clean_input)).strip()

        logger.debug(
            f"Query understood: raw='{clean_input}' -> text='{cleaned_text}', cat={detected_category}, "
            f"sub={detected_subcategory}, col={detected_colour}, style={detected_style}, max_p={max_price}"
        )

        return ExtractedFashionQuery(
            raw_query=clean_input,
            query_text=cleaned_text,
            category=detected_category,
            subcategory=detected_subcategory,
            colour=detected_colour,
            style=detected_style,
            brand=detected_brand,
            gender=detected_gender,
            occasion=detected_occasion,
            material=detected_material,
            min_price=min_price,
            max_price=max_price,
        )


# Global singleton instance
query_understanding_service = FashionQueryUnderstandingService()
