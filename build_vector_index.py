"""
CLI script to build and refresh the CLIP FAISS vector index for Smart Visual Shopping.
Usage:
    py build_vector_index.py
"""
import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.services.build_index import build_faiss_index

if __name__ == "__main__":
    print("=" * 65)
    print("  Smart Visual Shopping: CLIP (clip-vit-base-patch32) Vector Indexer")
    print("=" * 65)
    idx, meta = build_faiss_index()
    print(f"\n[DONE] Successfully indexed {meta['total_vectors']} vectors for {meta['unique_products']} products.")
    print(f"Model ID: {meta['model_id']}")
    print("=" * 65)
