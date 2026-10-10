# API contract: what the frontend expects

Share this with the backend teammates. If the backend differs, change `src/api/real.ts` (one file) instead of the pages.
All paths are under `/api` unless noted. JSON in/out. Authenticated calls send `Authorization: Bearer <token>`.

## Errors (any non-2xx)
```json
{ "error_code": "IMAGE_UNREADABLE", "message": "optional human text" }
```
FastAPI's default `{ "detail": "..." }` is also understood. Codes the UI turns into friendly text:
`IMAGE_UNREADABLE, IMAGE_TOO_SMALL, UNSUPPORTED_FILE, NO_MATCH, PRODUCT_NOT_FOUND, INVALID_INPUT, MODEL_UNAVAILABLE, INVALID_CREDENTIALS, EMAIL_TAKEN`.
A `401` anywhere (except login) logs the user out.

## Auth
| Method | Path | Body | Response |
|---|---|---|---|
| POST | /auth/register | `{ name, email, password }` | `{ token, user }` (role is always `shopper`; admins are seeded by the backend) |
| POST | /auth/login | `{ email, password }` | `{ token, user }` |
| GET | /auth/me | none | `user` |

`user = { id, name, email, role: "shopper" | "admin" }`

## Catalog and uploads
| Method | Path | Notes |
|---|---|---|
| GET | /products?q= | `{ items: Product[] }` |
| POST | /uploads | multipart field `file` (jpeg/png/webp, max 8 MB) → `{ image_id, url }` |

`Product = { id, sku, name, category, brand, price, currency, image_url, product_url?, attributes?: { connector?, width_cm?, ... } }`

## Long-running work = jobs
Starting calls return `{ job_id }` immediately.

| Method | Path | Body |
|---|---|---|
| POST | /similar/search | `{ image_id? , product_id? , top_k }` (`product_id` powers "More like this") |
| POST | /compat/check | `{ owned: { image_id?, product_id?, attributes? }, target_product_id }` |
| POST | /admin/reindex | none (admin only) |
| GET | /admin/stats | `{ product_count, indexed_count, last_indexed_at }` (admin only) |

### Job status
`GET /jobs/{job_id}` **and** every WebSocket frame use the same shape:
```json
{ "job_id": "...", "status": "queued|processing|done|failed",
  "stage": "embedding|searching|ranking|analysing|checking_rules|vision_check|indexing",
  "progress": 40,
  "result": { },
  "error_code": "IMAGE_UNREADABLE", "message": "..." }
```
WebSocket: `ws(s)://<host>/ws/jobs/{job_id}?token=<jwt>`. The server pushes a frame on each change and closes after `done`/`failed`.
The frontend tries the WebSocket first and falls back to polling `GET /jobs/{id}` every ~1 s.

### `result` for /similar/search
```json
{ "category_guess": { "label": "Footwear", "confidence": 0.88 },
  "matches": [ { "product": { }, "score": 0.93, "reason": "Similar silhouette and colour" } ] }
```
Up to 6 matches, best first. `score` is 0 to 1. Empty `matches` = "no close match" screen.

### `result` for /compat/check
```json
{ "verdict": "compatible|partly_compatible|not_compatible|not_enough_info",
  "reasons": ["..."],
  "missing_info": ["The connector type of your item"],
  "checks": [ { "rule": "Connector type", "status": "pass|fail|unknown", "detail": "..." } ],
  "source": "rules|rules+vlm" }
```
Per the spec: hard rule mismatches must win over any language-model opinion, and `not_enough_info` must always list `missing_info`.

### `result` for /admin/reindex
`{ "ok": true }`
