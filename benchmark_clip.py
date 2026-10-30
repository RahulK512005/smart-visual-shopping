"""
Benchmark evaluation script for Marqo FashionCLIP in Smart Visual Shopping.
Evaluates:
- Average inference latency (image embedding generation)
- Average inference latency (text embedding generation)
- Top-1, Recall@5, Recall@10 retrieval metrics across categories
- Category-level accuracy for indexed items
"""
import time
import io
from pathlib import Path
import numpy as np
from PIL import Image

from backend.app.services.clip_service import get_clip_service
from backend.app.services.faiss_engine import faiss_engine

def run_benchmark():
    print("=" * 65)
    print("  MARQO FASHIONCLIP RETRIEVAL & LATENCY BENCHMARK")
    print("=" * 65)

    clip = get_clip_service()
    clip.load_model()
    faiss_engine.load_index()

    print(f"Model ID:        {clip.model_id}")
    print(f"Device:          {clip.device}")
    print(f"Dimension:       {clip.embedding_dim}")
    print(f"Indexed Vectors: {faiss_engine.index.ntotal if faiss_engine.index else 0}")
    print(f"Total Products:  {len(faiss_engine.product_catalog)}")
    print("-" * 65)

    # 1. Latency benchmark
    print("\n[1] Measuring Inference Latency...")
    test_img = Image.new("RGB", (224, 224), color=(140, 100, 210))
    latencies = []
    for _ in range(10):
        t0 = time.perf_counter()
        _ = clip.extract_image_embedding(test_img)
        latencies.append((time.perf_counter() - t0) * 1000)

    avg_latency = float(np.mean(latencies))
    p95_latency = float(np.percentile(latencies, 95))
    print(f"    Image Inference Latency (Mean): {avg_latency:.2f} ms")
    print(f"    Image Inference Latency (P95):  {p95_latency:.2f} ms")

    text_latencies = []
    for _ in range(10):
        t0 = time.perf_counter()
        _ = clip.extract_text_embedding("luxury stainless steel chronograph watch")
        text_latencies.append((time.perf_counter() - t0) * 1000)

    avg_text_latency = float(np.mean(text_latencies))
    print(f"    Text Inference Latency (Mean):  {avg_text_latency:.2f} ms")

    # 2. Retrieval Evaluation on Category Targets
    print("\n[2] Evaluating Retrieval Accuracy across Categories...")
    test_queries = [
        # (category, query_text, expected_target_substrings)
        ("smartwatch", "Apple Watch Ultra titanium case with orange ocean band", ["watch", "ultra", "apple"]),
        ("wearable", "Fitness tracker activity band with heart rate monitor", ["band", "fitbit", "whoop", "galaxy", "watch"]),
        ("audio", "Over-ear noise cancelling wireless headphones", ["headphones", "sony", "bose", "airpods", "max"]),
        ("case", "Protective silicone phone case with magsafe", ["case", "silicone", "magsafe", "cover"]),
        ("cable", "Braided high-speed fast charging USB-C cable", ["cable", "braided", "usb-c"]),
        ("charger", "Compact multi-port GaN wall charger fast power", ["charger", "gan", "power", "anker", "ugreen"]),
    ]

    top1_hits = 0
    top5_hits = 0
    top10_hits = 0
    total_queries = len(test_queries)

    print(f"{'Category':<15} | {'Top-1':<7} | {'Recall@5':<10} | {'Recall@10':<10} | {'Top Match Name':<28}")
    print("-" * 75)

    for cat, query_text, keywords in test_queries:
        text_vec = clip.extract_text_embedding(query_text)
        results = faiss_engine.search_by_vector(text_vec, limit=10)

        top1_match = False
        top5_match = False
        top10_match = False
        top_name = "N/A"

        for rank, r in enumerate(results, start=1):
            p = faiss_engine.product_catalog.get(r["product_id"], {})
            name = (p.get("name") or "").lower()
            p_cat = (p.get("category") or "").lower()
            if rank == 1:
                top_name = p.get("name", "")[:28]

            is_match = p_cat == cat or any(kw in name for kw in keywords)
            if is_match:
                if rank == 1:
                    top1_match = True
                if rank <= 5:
                    top5_match = True
                if rank <= 10:
                    top10_match = True

        if top1_match:
            top1_hits += 1
        if top5_match:
            top5_hits += 1
        if top10_match:
            top10_hits += 1

        print(f"{cat:<15} | {'YES' if top1_match else 'NO':<7} | {'YES' if top5_match else 'NO':<10} | {'YES' if top10_match else 'NO':<10} | {top_name:<28}")

    top1_acc = (top1_hits / total_queries) * 100
    recall5 = (top5_hits / total_queries) * 100
    recall10 = (top10_hits / total_queries) * 100

    print("-" * 75)
    print(f"Overall Top-1 Retrieval Accuracy: {top1_acc:.1f}%")
    print(f"Overall Recall@5:                {recall5:.1f}%")
    print(f"Overall Recall@10:               {recall10:.1f}%")
    print("=" * 65)

if __name__ == "__main__":
    run_benchmark()

