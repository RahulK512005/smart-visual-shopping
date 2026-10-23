# Smart Visual Shopping — Backend API

Backend application for **Smart Visual Shopping**, providing visual search orchestration, a rich product catalog with verified specifications, and a deterministic, category-specific compatibility rules engine.

---

## 1. Architecture Overview & Ownership Boundary

```
┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
│        Frontend Client          │                 │       External AI/ML Service    │
│    (Web / Mobile Application)   │                 │    (Owned by AI/ML Engineer)    │
└──────────────┬──────────────────┘                 └────────────────▲────────────────┘
               │                                                     │
               │ HTTP REST (JSON & Multipart)                        │ POST /internal/search
               ▼                                                     │ (Image / Vector Query)
┌────────────────────────────────────────────────────────────────────┴────────────────┐
│                           SMART VISUAL SHOPPING BACKEND                             │
│                                                                                     │
│  ┌───────────────────────┐   ┌──────────────────────────┐   ┌────────────────────┐  │
│  │   API Route Layer     │   │  Visual Search Pipeline  │   │ Compatibility Rules│  │
│  │  - GET /api/health    │   │  - Upload validation     │   │  - Deterministic   │  │
│  │  - GET /api/products  │──▶│  - PIL integrity check   │──▶│  - Category rules  │  │
│  │  - POST /api/visual.. │   │  - ML Client (HTTPX)     │   │  - Traceable       │  │
│  │  - POST /api/compat.. │   │  - Rank preservation     │   │    verdicts        │  │
│  └───────────────────────┘   └──────────────────────────┘   └────────────────────┘  │
│                                           │                                         │
│                                           ▼                                         │
│                      ┌─────────────────────────────────────────┐                    │
│                      │       SQLAlchemy ORM & Catalog DB       │                    │
│                      │  - Flexible specifications JSON         │                    │
│                      │  - Verification & provenance metadata   │                    │
│                      └─────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### AI/ML Boundary

- **Backend Responsibility**: Request validation, safe image buffering, invoking the AI/ML service via an explicit client, preserving ML ranking order, enriching candidate IDs with verified catalog records, and executing deterministic compatibility evaluation.
- **AI/ML Service Responsibility**: Image embeddings (CLIP/SigLIP), vector index search (FAISS), and returning ranked candidate product IDs with similarity scores.
- **No Generative Guesswork**: The backend owns compatibility rules deterministically. Compatibility decisions are never delegated to an LLM or ML classifier. If required specifications are unverified or absent, the engine reports `cannot_verify`.

---

## 2. Technology Stack

- **Language & Runtime**: Python 3.11+
- **API Framework**: FastAPI, Starlette
- **Data Modeling & Validation**: Pydantic v2, Pydantic-Settings
- **Database & ORM**: SQLAlchemy 2.0 (SQLite for local development, PostgreSQL compatible)
- **HTTP Client**: HTTPX (async & sync client support with connection/read timeouts)
- **Image Validation**: Pillow (PIL)
- **Testing**: Pytest, Pytest-Asyncio, FastAPI TestClient

---

## 3. Directory Structure

```
├── .agents/                             # Antigravity agent customizations
│   ├── rules/
│   │   └── ponytail.md                  # Ponytail lazy senior dev ruleset
│   ├── plugins/
│   │   └── ponytail/                    # Bundled Ponytail plugin package
│   └── skills/
│       ├── ponytail/                    # Mode toggle & core lazy dev instructions
│       ├── ponytail-audit/              # Whole-repo health & bloat audit skill
│       ├── ponytail-review/             # PR & diff quality reviewer skill
│       ├── ponytail-debt/               # Shortcut & deferral tracker skill
│       ├── ponytail-gain/               # Benchmark impact scoreboard skill
│       └── ponytail-help/               # Ponytail quick reference guide
├── AGENTS.md                            # Always-on senior dev agent ruleset
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI application entrypoint & middleware
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── health.py            # GET /api/health
│   │   │       ├── products.py          # GET /api/products, GET /api/products/{id}
│   │   │       ├── visual_search.py     # POST /api/visual-search, GET /more-like-this/{id}
│   │   │       └── compatibility.py     # POST /api/compatibility/check & /identify-photo
│   │   ├── core/
│   │   │   ├── config.py                # Pydantic Settings & environment variables
│   │   │   ├── errors.py                # Domain exceptions & error codes
│   │   │   └── logging.py               # Structured logger
│   │   ├── db/
│   │   │   ├── session.py               # Database engine & sessionmaker
│   │   │   ├── models.py                # Product SQLAlchemy model
│   │   │   ├── init_db.py               # Database initialization routine
│   │   │   ├── seed_data.py             # Curated seed products with verified specs
│   │   │   └── repositories/
│   │   │       └── product_repo.py      # Parameterized catalog repository
│   │   ├── schemas/
│   │   │   ├── product.py               # Product schemas & pagination responses
│   │   │   ├── visual_search.py         # Visual search request/response schemas
│   │   │   ├── compatibility.py         # Compatibility verdicts and check items
│   │   │   └── ml_contract.py           # Contract definition for internal ML service
│   │   ├── services/
│   │   │   ├── product_service.py       # Catalog query orchestration
│   │   │   ├── ml_client.py             # Internal ML HTTP client with timeouts
│   │   │   ├── visual_search_orchestrator.py # Image validation & ML enrichment
│   │   │   ├── faiss_engine.py          # Vector search engine with multi-image aggregation
│   │   │   ├── clip_service.py          # OpenAI CLIP embedding inference service
│   │   │   └── compatibility_service.py # Deterministic compatibility evaluator
│   │   └── rules/
│   │       ├── base.py                  # Base rule abstractions & RuleContext
│   │       ├── registry.py              # Rule registry & fallback handling
│   │       └── categories/
│   │           ├── power_rules.py       # Chargers, Power Banks, Wattage & Protocols
│   │           ├── cable_rules.py       # Cable plugs, MFi, and throughput
│   │           ├── display_rules.py     # Monitors, DP Alt Mode, and 90W PD
│   │           ├── wearable_rules.py    # iOS vs Android smartwatch ecosystems
│   │           ├── case_rules.py        # Exact chassis model & dimension fit
│   │           └── audio_rules.py       # Bluetooth codecs & 3.5mm jacks
│   └── tests/
│       ├── conftest.py                  # In-memory DB and test client fixtures
│       ├── test_health.py               # Health & dependency status tests
│       ├── test_products.py             # Catalog pagination & filtering tests
│       ├── test_visual_search.py        # Visual search & rank preservation tests
│       ├── test_compatibility.py        # Cross-category compatibility & upload tests
│       ├── test_ml_client.py            # ML client timeout & error tests
│       ├── test_clip_service.py         # CLIP model initialization & normalization tests
│       ├── test_clip_integration.py     # Full-pipeline visual search integration tests
│       ├── test_faiss_engine.py         # FAISS vector index & aggregation tests
│       └── test_rules_engine.py         # Seed idempotency, display & audio tests
├── frontend/                            # Next.js 15 + React 19 web application
│   ├── src/                             # App router, components, context, and API client
│   └── tests/                           # Vitest frontend component & contract tests
├── mock_ml_service.py                   # Standalone CLIP + FAISS microservice (port 8001)
├── run_all.py                           # Full stack launcher (ML + Backend + Frontend)
├── seed_catalog.py                      # Standalone catalog seeder runner
├── build_vector_index.py                # FAISS vector index generator script
├── requirements.txt                     # Pinned project dependencies
├── .env.example                         # Environment configuration template
└── README.md                            # Comprehensive technical documentation
```

---

## 4. Setup & Installation

### Step 1: Create Virtual Environment

Using `uv`:

```bash
uv venv .venv
.venv\Scripts\activate
uv pip install -r requirements.txt
```

Or standard Python:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Configure Environment

Copy the example environment configuration:

```bash
cp .env.example .env
```

Key environment settings in `.env`:
| Key | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./smart_visual_shopping.db` | Database connection string (SQLite or PostgreSQL) |
| `ML_SERVICE_URL` | `http://localhost:8001` | Base URL of the AI/ML visual embedding service |
| `ML_SERVICE_TIMEOUT_SECONDS` | `5.0` | Timeout for ML vector inference |
| `MAX_UPLOAD_SIZE_BYTES` | `10485760` | Maximum uploaded query image size (10MB) |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Allowed frontend origins |

### Step 3: Seed Catalog Data

Initialize the database tables and populate 15 curated products:

```bash
python seed_catalog.py
```

---

## 5. Running Locally

### Starting the Backend API

Run with Uvicorn:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive OpenAPI documentation is available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Starting the Mock ML Service (for Local Development)

To test visual search locally without needing the AI/ML team's GPU infrastructure:

```bash
uvicorn mock_ml_service:app --port 8001 --reload
```

---

## 6. Running Automated Tests

### Backend Test Suite (Pytest)

Run all 59 backend integration, vector index, and rule verification tests:

```bash
# From repository root
pytest -v backend/tests

# Or using Python runner
py -m pytest backend/tests -v
```

The backend test suite validates:

- **Product Catalog**: Pagination, category/brand/price filtering, and 404 responses.
- **Image Upload Validation**: MIME type checks, 10MB limits, Pillow header integrity, and empty/corrupt file rejection (`/visual-search` and `/compatibility/identify-photo`).
- **ML Boundary & Resilience**: External ML timeouts, connection refused, 500 error propagation, and non-blocking threadpool dispatch.
- **Vector Search & Aggregation**: FAISS `IndexFlatIP` normalization, multi-image per-product max-score deduplication, and category restriction.
- **Compatibility Engine**: All category pair rules, deterministic outcomes (`compatible`, `incompatible`, `cannot_verify`), and unverified specification handling.

### Frontend Test Suite (Vitest)

Run the 19 frontend unit and React component tests:

```bash
cd frontend
npm test
```

The frontend test suite validates:

- API payload normalization and error handling (`tests/normalize.test.ts`).
- Backend HTTP contracts and exception mapping (`tests/backendContract.test.ts`).
- Image upload drag-and-drop & file type constraints (`tests/ImageUploader.test.tsx`).
- Visual search result cards, match percentage badges, and compatibility status indicators (`tests/ResultView.test.tsx`).

### Run Both Simultaneously

```bash
npm test
```

---

## 7. API Endpoints & Sample Requests

### 1. Health Check

`GET /api/health`

```bash
curl -X GET "http://localhost:8000/api/health"
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-10-10T08:15:00Z",
  "dependencies": {
    "database": {
      "status": "healthy"
    },
    "ml_visual_search_service": {
      "status": "reachable",
      "details": {
        "model": "clip-vit-base-patch32",
        "service": "visual-embedding-inference"
      }
    }
  }
}
```

---

### 2. Product Catalog

`GET /api/products`

**Query Parameters:**

- `category` (optional, e.g. `smartphone`, `charger`, `monitor`)
- `brand` (optional, e.g. `Apple`, `Samsung`, `Dell`, `Anker`)
- `q` (optional full-text search)
- `page` (default: 1)
- `page_size` (default: 20)

```bash
curl -X GET "http://localhost:8000/api/products?category=charger"
```

`GET /api/products/{id}`

```bash
curl -X GET "http://localhost:8000/api/products/prod_apple_iphone_15_pro"
```

---

### 3. Visual Search

`POST /api/visual-search`

Uploads an image, contacts the ML service for similarity scoring, and returns ranked products with full catalog details.

```bash
curl -X POST "http://localhost:8000/api/visual-search" \
  -F "file=@sample_product.jpg;type=image/jpeg" \
  -F "limit=5"
```

**Response:**

```json
{
  "query_image": {
    "filename": "sample_product.jpg",
    "content_type": "image/jpeg",
    "size_bytes": 142050,
    "width": 1024,
    "height": 768,
    "format": "JPEG"
  },
  "total_matches": 3,
  "results": [
    {
      "rank": 1,
      "similarity_score": 0.9421,
      "product": {
        "id": "prod_apple_iphone_15_pro",
        "name": "Apple iPhone 15 Pro (128GB, Natural Titanium)",
        "brand": "Apple",
        "model": "iPhone 15 Pro",
        "category": "smartphone",
        "specifications": {
          "port_type": "USB-C",
          "charging_protocols": [
            "USB Power Delivery (PD 3.0)",
            "Qi2",
            "MagSafe"
          ],
          "max_charging_wattage_w": 27.0
        },
        "verification_status": "verified"
      }
    }
  ]
}
```

#### More Like This (Visual Neighbors)

`GET /api/visual-search/more-like-this/{product_id}`

Retrieves visually similar neighbor products using dense FAISS embeddings while automatically excluding the source product from the recommendation list.

```bash
curl -X GET "http://localhost:8000/api/visual-search/more-like-this/prod_apple_iphone_15_pro?limit=4"
```

---

### 4. Compatibility Check

`POST /api/compatibility/check`

Evaluates deterministic compatibility between the user's existing device and a candidate accessory.

#### Example 1: Incompatible Connector (iPhone 15 Pro + Lightning Cable)

```bash
curl -X POST "http://localhost:8000/api/compatibility/check" \
  -H "Content-Type: application/json" \
  -d '{
    "existing_product_id": "prod_apple_iphone_15_pro",
    "candidate_product_id": "prod_anker_lightning_cable_mfi"
  }'
```

**Response:**

```json
{
  "verdict": "incompatible",
  "summary_explanation": "Incompatible: Anker PowerLine III USB-C to Lightning Cable is not compatible with Apple iPhone 15 Pro.\n- Cable Connector Mating: Physical incompatibility: Apple iPhone 15 Pro requires a USB-C plug, but this cable terminates in Lightning.",
  "failed_checks": [
    {
      "check_id": "cable_connector_mating",
      "title": "Cable Connector Mating",
      "property_checked": "connector_types",
      "existing_value": "USB-C",
      "candidate_value": "USB-C to Lightning",
      "rule_applied": "Device port requires matching plug type (USB-C cannot mate with Lightning)",
      "outcome": "fail",
      "severity": "critical",
      "explanation": "Physical incompatibility: Apple iPhone 15 Pro requires a USB-C plug, but this cable terminates in Lightning.",
      "evidence": "Apple MFi Licensee Database & Anker Product Compliance Registry",
      "verification_status": "verified"
    }
  ],
  "passed_checks": [],
  "cannot_verify_checks": [],
  "missing_specifications": []
}
```

#### Example 2: Incompatible Ecosystem (Galaxy S24 Ultra + Apple Watch)

```bash
curl -X POST "http://localhost:8000/api/compatibility/check" \
  -H "Content-Type: application/json" \
  -d '{
    "existing_product_id": "prod_samsung_galaxy_s24_ultra",
    "candidate_product_id": "prod_apple_watch_series_9"
  }'
```

**Response:**

```json
{
  "verdict": "incompatible",
  "summary_explanation": "Incompatible: Apple Watch Series 9 GPS 41mm is not compatible with Samsung Galaxy S24 Ultra.\n- Operating System Ecosystem Match: Apple Watch requires an Apple iPhone running iOS and does not pair with Android devices like Samsung Galaxy S24 Ultra."
}
```

#### Example 3: Missing Specifications (Phone + Unverified Hub)

```bash
curl -X POST "http://localhost:8000/api/compatibility/check" \
  -H "Content-Type: application/json" \
  -d '{
    "existing_product_id": "prod_apple_iphone_15_pro",
    "candidate_product_id": "prod_generic_usb_hub_unverified"
  }'
```

**Response:**

```json
{
  "verdict": "cannot_verify",
  "summary_explanation": "Cannot verify compatibility between Generic Mini 4-in-1 Hub and Apple iPhone 15 Pro due to unverified or missing technical specifications.",
  "cannot_verify_checks": [ ... ],
  "missing_specifications": [
    {
      "product_id": "prod_generic_usb_hub_unverified",
      "product_name": "Generic Mini 4-in-1 Hub",
      "missing_property": "output_ports",
      "impact_reason": "Cannot verify connector interface compatibility"
    }
  ]
}
```

---

### 5. Identify Owned Device From Photo

`POST /api/compatibility/identify-photo`

Identifies what device the user owns from a single camera photo or upload. Validates image size and headers, extracts visual embeddings, and returns matching catalog candidates with similarity confidence scores.

```bash
curl -X POST "http://localhost:8000/api/compatibility/identify-photo" \
  -F "file=@my_phone.jpg;type=image/jpeg"
```

**Response:**

```json
{
  "identified": {
    "id": "prod_apple_iphone_15_pro",
    "name": "Apple iPhone 15 Pro (128GB, Natural Titanium)",
    "brand": "Apple",
    "model": "iPhone 15 Pro",
    "category": "smartphone"
  },
  "confidence": 0.9421,
  "candidates": [
    {
      "product": {
        "id": "prod_apple_iphone_15_pro",
        "name": "Apple iPhone 15 Pro..."
      },
      "score": 0.9421,
      "explanation": "High visual affinity with smartphone silhouette (94% visual match)"
    }
  ]
}
```

---

## 8. Summary of Implemented Compatibility Rules

| Category Pair                  | Properties Evaluated                                                                      | Deterministic Decision Logic                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Charger ↔ Device**           | `output_ports`, `charging_protocols`, `max_output_wattage_w`, `min_recommended_charger_w` | Fails if charger port cannot connect to device or wattage is below minimum device requirement. Warns if below maximum fast-charging rate. |
| **Cable ↔ Device**             | `source_connector`, `target_connector`, `max_supported_wattage_w`, `mfi_certified`        | Fails if connector ends (e.g. Lightning vs USB-C) do not mate. Warns if cable wattage throttles laptop power.                             |
| **Monitor ↔ Computer**         | `video_inputs`, `video_out_support`, `usb_c_power_delivery_w`                             | Validates DP Alt Mode / HDMI / Thunderbolt match. Verifies monitor reverse power delivery satisfies laptop wattage.                       |
| **Smartwatch ↔ Phone**         | `compatible_os`, `min_os_version`, `bluetooth_version`                                    | Enforces iOS vs Android ecosystem boundaries. Checks OS release version numbers.                                                          |
| **Case ↔ Phone**               | `target_device_model`, `dimensions_mm`                                                    | Validates exact model name match and sub-millimeter physical dimension tolerance.                                                         |
| **Audio ↔ Device**             | `bluetooth_version`, `headphone_jack_3_5mm`, `bluetooth_codecs`                           | Verifies Bluetooth radio and validates 3.5mm jack requirement against host chassis.                                                       |
| **Unverified / Missing Specs** | Any required technical attribute                                                          | Emits `cannot_verify` with explicit missing attribute notices; never guesses or hallucinates.                                             |

---

## 9. AI/ML Visual Embedding Pipeline (OpenAI CLIP & FAISS)

The backend is integrated with **openai/clip-vit-base-patch32** via Hugging Face Transformers and **FAISS** vector search.

### Architecture & Request Flow

1. **User Upload**: A query image (JPEG, PNG, WebP) is received by `POST /api/visual-search` or `POST /internal/search`.
2. **Safe Decoding & Validation**: Pillow verifies image headers and protects against decompression bombs (`Image.MAX_IMAGE_PIXELS = 20_000_000`). Images are converted to standard RGB.
3. **Embedding Generation**: The pretrained `CLIPModel` and `CLIPProcessor` extract a 512-dimensional visual embedding inside `torch.inference_mode()`. The embedding is L2-normalized so inner products represent exact cosine similarity.
4. **FAISS Dense Retrieval**: FAISS `IndexFlatIP(512)` retrieves the nearest neighbor vectors.
5. **Multi-Image Aggregation**: When a product has multiple catalog images, scores are aggregated by taking the **maximum similarity score** per product ID. This prevents duplicate product cards in search results while ensuring the best matching visual angle/image is rewarded.
6. **Catalog Enrichment**: Matching candidate IDs are retrieved from the database, enriched with full specifications, and returned preserving the exact rank ordering.

### Building & Refreshing the Vector Index

To build or update the FAISS vector index from all products in the database:

```bash
py build_vector_index.py
```

Or via module execution:

```bash
py -m backend.app.services.build_index
```

Features of the indexing pipeline:

- **Resilient Image Fetching**: Safe HTTP client with timeouts, size limits, and format verification; broken/404 image URLs are logged as warnings without crashing the indexer.
- **Embedding Cache**: Caches embeddings in `embedding_cache.pkl` by URL/hash so unchanged images are never re-downloaded or re-embedded.
- **Metadata Persistence**: Atomically writes `catalog_faiss.index` and `catalog_meta.json` with versioning, model ID, creation timestamp, and entry-to-product mapping.

### Configuration & Environment Variables

Configured in `.env`:
| Key | Default | Description |
|---|---|---|
| `CLIP_MODEL_ID` | `openai/clip-vit-base-patch32` | Hugging Face model repository ID |
| `CLIP_DEVICE` | `auto` | Execution device: `auto` (detects CUDA or falls back to CPU), `cpu`, or `cuda` |
| `VECTOR_INDEX_PATH` | `backend/app/services/catalog_faiss.index` | Path to persistent FAISS index file |
| `VECTOR_METADATA_PATH` | `backend/app/services/catalog_meta.json` | Path to index metadata JSON |
| `VISUAL_SEARCH_TOP_K` | `10` | Default number of candidate matches |
| `MAX_IMAGE_UPLOAD_MB` | `10` | Maximum upload size in megabytes |

### Model Download & Caching

Weights are cached in the standard Hugging Face directory (`~/.cache/huggingface/hub/`).
To pre-download the model weights offline or during container build:

```python
from transformers import CLIPModel, CLIPProcessor
CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
```

### Important Model Limitations

- **Visual Similarity vs Compatibility**: CLIP visual embeddings identify similar forms, silhouettes, colors, and design characteristics. A high visual similarity score is **not** proof of technical compatibility or brand authenticity.
- **Deterministic Separation**: Compatibility validation is handled strictly by the backend deterministic rules engine (`backend/app/rules`), never by visual embeddings or generative models.

---

## 10. Full Stack Integration & Quick Start

Both frontend (Next.js) and backend (FastAPI) are fully integrated with real-time health monitoring, catalog browsing, visual search, and deterministic compatibility checking.

### One-Command Full Stack Startup

To start the ML service (port 8001), backend API (port 8000), and Next.js frontend (port 3000) simultaneously:

```bash
# Using Python
py run_all.py

# Or using PowerShell
.\start_all.ps1

# Or using npm
npm run dev
```

### URLs

- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Backend Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **AI/ML Service Health**: [http://127.0.0.1:8001/internal/health](http://127.0.0.1:8001/internal/health)

---
