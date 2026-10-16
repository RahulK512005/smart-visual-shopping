# Generated 300+ Product Catalog Dataset
import json
from pathlib import Path

_json_path = Path(__file__).parent / 'catalog_products_300.json'
with open(_json_path, 'r', encoding='utf-8') as _f:
    CATALOG_PRODUCTS_300 = json.load(_f)
