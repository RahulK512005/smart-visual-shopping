"""
Evaluation and Benchmarking Script for Marqo FashionCLIP + FAISS Vector Search.
Evaluates:
- Top-1 Semantic Retrieval Accuracy
- Recall@5
- Recall@10
- Mean Reciprocal Rank (MRR)
- FashionCLIP text encoder latency (ms)
- FAISS IndexFlatIP search latency (ms)
- End-to-end query latency (ms)
Across Clothing, Footwear, Watches, and Accessories.
"""
import time
import statistics
from typing import Dict, List, Any
import numpy as np

from backend.app.services.clip_service import get_clip_service
from backend.app.services.faiss_engine import faiss_engine
from backend.app.services.query_understanding import query_understanding_service


BENCHMARK_SUITE = [
    # --- CLOTHING ---
    {
        "query": "black oversized streetwear t-shirt",
        "expected_category": "clothing",
        "expected_subcategories": ["t-shirt", "tshirt", "tee"],
        "expected_keywords": ["oversized", "streetwear", "black", "cotton"],
    },
    {
        "query": "Korean-style summer dress with floral print",
        "expected_category": "clothing",
        "expected_subcategories": ["dress", "skirt"],
        "expected_keywords": ["korean", "floral", "summer", "dress"],
    },
    {
        "query": "vintage oversized hoodie in beige",
        "expected_category": "clothing",
        "expected_subcategories": ["hoodie", "sweatshirt"],
        "expected_keywords": ["hoodie", "oversized", "beige", "vintage"],
    },
    {
        "query": "baggy cargo trousers with pockets",
        "expected_category": "clothing",
        "expected_subcategories": ["trousers", "pants", "cargo"],
        "expected_keywords": ["cargo", "baggy", "trousers", "pants"],
    },

    # --- FOOTWEAR ---
    {
        "query": "white chunky platform sneakers for college",
        "expected_category": "footwear",
        "expected_subcategories": ["sneakers", "shoes"],
        "expected_keywords": ["white", "sneakers", "platform", "chunky"],
    },
    {
        "query": "formal brown leather oxford dress shoes",
        "expected_category": "footwear",
        "expected_subcategories": ["shoes", "formal", "loafers"],
        "expected_keywords": ["brown", "leather", "formal", "oxford"],
    },
    {
        "query": "cushioned running shoes for marathon training",
        "expected_category": "footwear",
        "expected_subcategories": ["sneakers", "shoes", "running"],
        "expected_keywords": ["running", "shoes", "cushion"],
    },

    # --- WATCHES ---
    {
        "query": "minimalist silver chronograph watch with leather strap",
        "expected_category": "accessories",
        "expected_subcategories": ["watch", "chronograph"],
        "expected_keywords": ["watch", "chronograph", "strap", "dial"],
    },
    {
        "query": "matte black sports digital watch for daily wear",
        "expected_category": "accessories",
        "expected_subcategories": ["watch", "smartwatch"],
        "expected_keywords": ["watch", "black", "sports", "digital"],
    },

    # --- ACCESSORIES ---
    {
        "query": "brown leather crossbody shoulder bag",
        "expected_category": "accessories",
        "expected_subcategories": ["bag", "handbag", "crossbody"],
        "expected_keywords": ["leather", "bag", "crossbody", "brown"],
    },
    {
        "query": "retro Y2K rectangle sunglasses",
        "expected_category": "accessories",
        "expected_subcategories": ["sunglasses", "eyewear"],
        "expected_keywords": ["sunglasses", "y2k", "retro"],
    },
    {
        "query": "minimalist silver chain necklace",
        "expected_category": "accessories",
        "expected_subcategories": ["jewelry", "necklace", "chain"],
        "expected_keywords": ["silver", "chain", "necklace"],
    },
]


def evaluate_query(item: Dict[str, Any], clip_service, top_k: int = 10) -> Dict[str, Any]:
    query_text = item["query"]
    exp_cat = item["expected_category"].lower()
    exp_subcats = [s.lower() for s in item["expected_subcategories"]]
    exp_keywords = [k.lower() for k in item["expected_keywords"]]

    # 1. Measure text encoding latency
    t0 = time.perf_counter()
    text_emb = clip_service.extract_text_embedding(query_text)
    t_encode_ms = (time.perf_counter() - t0) * 1000.0

    # 2. Measure FAISS vector search latency directly
    t1 = time.perf_counter()
    matches = faiss_engine.search_by_vector(text_emb, limit=top_k)
    t_search_ms = (time.perf_counter() - t1) * 1000.0

    total_latency_ms = t_encode_ms + t_search_ms

    # Evaluate matches against ground truth expectations
    is_hit_top1 = False
    is_hit_top5 = False
    is_hit_top10 = False
    reciprocal_rank = 0.0

    for rank_idx, match in enumerate(matches):
        p_id = match["product_id"]
        cat_meta = faiss_engine.product_catalog.get(p_id, {})
        name = (cat_meta.get("name") or "").lower()
        desc = (cat_meta.get("description") or "").lower()
        cat = (cat_meta.get("category") or "").lower()
        subcat = (cat_meta.get("subcategory") or "").lower()
        comb_text = f"{name} {desc} {cat} {subcat}"

        # Match condition: category matches OR subcategory matches OR major keywords appear in product text
        cat_match = (cat == exp_cat or exp_cat in cat)
        subcat_match = any(sc in subcat or sc in name for sc in exp_subcats)
        keyword_match = sum(kw in comb_text for kw in exp_keywords) >= 1

        is_relevant = (cat_match and (subcat_match or keyword_match)) or (subcat_match and keyword_match)

        if is_relevant:
            if rank_idx == 0:
                is_hit_top1 = True
            if rank_idx < 5:
                is_hit_top5 = True
            if rank_idx < 10:
                is_hit_top10 = True
            if reciprocal_rank == 0.0:
                reciprocal_rank = 1.0 / (rank_idx + 1)

    return {
        "query": query_text,
        "category": item["expected_category"],
        "top1": 1.0 if is_hit_top1 else 0.0,
        "top5": 1.0 if is_hit_top5 else 0.0,
        "top10": 1.0 if is_hit_top10 else 0.0,
        "mrr": reciprocal_rank,
        "t_encode_ms": t_encode_ms,
        "t_search_ms": t_search_ms,
        "t_total_ms": total_latency_ms,
        "num_matches": len(matches),
        "top_match_name": faiss_engine.product_catalog.get(matches[0]["product_id"], {}).get("name") if matches else "None",
        "top_match_score": matches[0]["score"] if matches else 0.0,
    }


def run_benchmark():
    print("=" * 80)
    print("  MARQO FASHIONCLIP + FAISS RETRIEVAL ACCURACY & LATENCY BENCHMARK")
    print("=" * 80)

    # 1. Warm up model
    print("[1/3] Initializing FashionCLIP model and transforms...")
    clip = get_clip_service()
    clip.load_model()
    _ = clip.extract_text_embedding("warmup query")
    print(f"      Model ready: {clip.model_id} (Dim: {clip.embedding_dim})")

    # 2. Check FAISS engine
    faiss_engine.load_index()
    print(f"      FAISS Index vectors: {faiss_engine.index.ntotal if faiss_engine.index else 0}, Products: {len(faiss_engine.product_catalog)}")

    # 3. Run Benchmark queries
    print(f"\n[2/3] Executing benchmark suite ({len(BENCHMARK_SUITE)} test queries)...")
    results = []
    category_results: Dict[str, List[Dict[str, Any]]] = {}

    for idx, item in enumerate(BENCHMARK_SUITE, 1):
        res = evaluate_query(item, clip, top_k=10)
        results.append(res)
        cat = item["expected_category"]
        category_results.setdefault(cat, []).append(res)

        print(f"  [{idx:02d}/{len(BENCHMARK_SUITE):02d}] \"{res['query'][:38]:<38}\" "
              f"| Top1: {'YES' if res['top1'] else 'NO '} "
              f"| R@5: {'YES' if res['top5'] else 'NO '} "
              f"| Latency: {res['t_total_ms']:.1f}ms "
              f"| Best: {res['top_match_name'][:24]} ({res['top_match_score']:.3f})")

    # 4. Aggregations
    top1_avg = statistics.mean([r["top1"] for r in results]) * 100
    top5_avg = statistics.mean([r["top5"] for r in results]) * 100
    top10_avg = statistics.mean([r["top10"] for r in results]) * 100
    mrr_avg = statistics.mean([r["mrr"] for r in results])

    avg_encode_ms = statistics.mean([r["t_encode_ms"] for r in results])
    avg_search_ms = statistics.mean([r["t_search_ms"] for r in results])
    avg_total_ms = statistics.mean([r["t_total_ms"] for r in results])

    print("\n" + "=" * 80)
    print("  OVERALL RETRIEVAL PERFORMANCE SUMMARY")
    print("=" * 80)
    print(f"  Top-1 Retrieval Accuracy : {top1_avg:6.2f}%")
    print(f"  Recall@5                 : {top5_avg:6.2f}%")
    print(f"  Recall@10                : {top10_avg:6.2f}%")
    print(f"  Mean Reciprocal Rank     : {mrr_avg:6.3f}")
    print("-" * 80)
    print("  LATENCY BENCHMARKS")
    print("-" * 80)
    print(f"  FashionCLIP Text Encoder : {avg_encode_ms:6.2f} ms")
    print(f"  FAISS IndexFlatIP Search : {avg_search_ms:6.2f} ms")
    print(f"  Total Retrieval Pipeline : {avg_total_ms:6.2f} ms")
    print("-" * 80)
    print("  CATEGORY-WISE BREAKDOWN")
    print("-" * 80)
    print(f"  {'Category':<15} | {'Count':<5} | {'Top-1':<7} | {'Recall@5':<9} | {'Avg Latency':<12}")
    print(f"  {'-'*15}-|-{'-'*5}-|-{'-'*7}-|-{'-'*9}-|-{'-'*12}")
    for cat, list_res in category_results.items():
        c_top1 = statistics.mean([r["top1"] for r in list_res]) * 100
        c_top5 = statistics.mean([r["top5"] for r in list_res]) * 100
        c_lat = statistics.mean([r["t_total_ms"] for r in list_res])
        print(f"  {cat.capitalize():<15} | {len(list_res):<5} | {c_top1:6.1f}% | {c_top5:8.1f}% | {c_lat:8.2f} ms")
    print("=" * 80)


if __name__ == "__main__":
    run_benchmark()
