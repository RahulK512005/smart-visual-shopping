# API contract (verified against the backend code on `main`)

Source of truth: `backend/app/schemas/*` and `backend/app/api/routes/*`. All paths are under `/api`.

| Endpoint | Request | Response |
|---|---|---|
| `GET /api/health` | - | `{ status: healthy\|degraded\|unhealthy, dependencies }` |
| `GET /api/products?page_size=100` | query: `q, category, brand, page, page_size (max 100)` | `{ items, total, page, page_size, total_pages }` |
| `GET /api/products/{id}` | - | product |
| `POST /api/visual-search?limit=10` | multipart, file field **`file`**, max 10 MB, JPEG/PNG/WebP | `{ query_image, total_matches, results: [{ rank, similarity_score, product }] }` |
| `POST /api/compatibility/check` | JSON `{ existing_product_id, candidate_product_id, context? }` | `{ verdict, summary_explanation, passed_checks[], failed_checks[], cannot_verify_checks[], missing_specifications[] }` |

Product fields used: `id, name, brand, model, category, description, image_url, price, currency, specifications, spec_source, verification_status`.
Check item fields used: `title, outcome (pass|fail|cannot_verify), severity, existing_value, candidate_value, explanation, evidence`.

Notes
- Backend `degraded` health usually means the ML service is unreachable, so visual search will fail until it runs.
- The catalog list is limited to the first 100 products (no pagination UI yet).
- The optional "extra details" in the checker are sent as `context`.
- Backend CORS defaults allow `http://localhost:3000`.
