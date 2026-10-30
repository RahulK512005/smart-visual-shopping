# Smart Visual Shopping — Full Stack AI Visual Search & Compatibility Engine

Full-stack production platform for **Smart Visual Shopping**, providing visual search powered by **Marqo FashionCLIP** and **FAISS**, a verified product catalog, and a deterministic, category-specific compatibility rules engine.

---

## 1. Architecture Overview & Ownership Boundary

```
┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
│        Frontend Client          │                 │    AI/ML Service (FashionCLIP)  │
│   (Next.js 15, React 19, TS)    │                 │   (Marqo FashionCLIP + FAISS)   │
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

### AI/ML Boundary & Invariants

- **Backend Responsibility**: Request validation, safe image buffering, invoking the AI/ML service via an explicit client, preserving ML ranking order, enriching candidate IDs with verified catalog records, and executing deterministic compatibility evaluation.
- **AI/ML Service Responsibility**: Fashion-specialized image and text embeddings via **Marqo FashionCLIP** (`hf-hub:Marqo/marqo-fashionCLIP`) using OpenCLIP, dense FAISS vector index search, and returning ranked candidate product IDs with similarity scores.
- **Deterministic Separation**: Compatibility decisions are 100% deterministic and never guessed or synthesized by generative models or embeddings. If required specifications are unverified or absent, the engine reports `cannot_verify`.

---

## 2. Technology Stack

### Backend & AI/ML
- **Language & Runtime**: Python 3.11+
- **API Framework**: FastAPI, Uvicorn, Starlette
- **Embedding Model**: `Marqo/marqo-fashionCLIP` via `open_clip`
- **Vector Search Engine**: FAISS (`IndexFlatIP`, 512-dimensional cosine similarity)
- **Data Modeling & Validation**: Pydantic v2, Pydantic-Settings
- **Database & ORM**: SQLAlchemy 2.0 (SQLite for local development, PostgreSQL compatible)
- **HTTP Client**: HTTPX (async & sync client support with connection/read timeouts)
- **Image Validation**: Pillow (PIL with decompression bomb safeguards)
- **Testing**: Pytest (72 passing tests across 10 test modules)

### Frontend
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 3.4 with cyber-ink and volt glassmorphism design system
- **Testing**: Vitest 5.0 + React Testing Library (25 passing unit and component tests)
- **State Management**: React state + `CompatibilityContext` synced to `sessionStorage`
- **Image Preprocessing**: Client-side canvas downscaling (images >600KB downscaled to 1024px @ 0.85 JPEG)

---

## 3. Directory Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI application entrypoint & middleware
│   │   ├── api/routes/
│   │   │   ├── health.py                # GET /api/health
│   │   │   ├── products.py              # GET /api/products, GET /api/products/{id}
│   │   │   ├── visual_search.py         # POST /api/visual-search, GET /more-like-this/{id}
│   │   │   └── compatibility.py         # POST /api/compatibility/check & /identify-photo
│   │   ├── core/
│   │   │   ├── config.py                # Pydantic Settings & environment variables
│   │   │   ├── errors.py                # Domain exceptions & error codes
│   │   │   └── logging.py               # Structured logger
│   │   ├── db/
│   │   │   ├── session.py               # Database engine & sessionmaker
│   │   │   ├── models.py                # Product SQLAlchemy model
│   │   │   ├── init_db.py               # Database initialization routine
│   │   │   └── seed_data.py             # Curated seed products with verified specs
│   │   ├── schemas/
│   │   │   ├── product.py               # Product schemas & pagination responses
│   │   │   ├── visual_search.py         # Visual search request/response schemas
│   │   │   ├── compatibility.py         # Compatibility verdicts and check items
│   │   │   └── ml_contract.py           # Contract definition for internal ML service
│   │   ├── services/
│   │   │   ├── clip_service.py          # Marqo FashionCLIP OpenCLIP inference service
│   │   │   ├── faiss_engine.py          # FAISS vector engine with multi-image aggregation
│   │   │   ├── build_index.py           # FashionCLIP vector index builder
│   │   │   ├── product_service.py       # Catalog query orchestration
│   │   │   ├── ml_client.py             # Internal ML HTTP client with timeouts
│   │   │   ├── visual_search_orchestrator.py # Image validation & ML enrichment
│   │   │   ├── compatibility_service.py # Deterministic compatibility evaluator
│   │   │   ├── fashionclip_fashion.index      # Persistent 512-d FAISS index
│   │   │   └── fashionclip_fashion_meta.json  # Vector ID to product ID mapping metadata
│   │   └── rules/categories/            # Category-specific deterministic rule evaluators
│   └── tests/                           # 72 Pytest tests covering ML, FAISS, API, and rules
├── frontend/                            # Redesigned Next.js 15 web client
│   ├── src/
│   │   ├── app/                         # App Router pages (/, /search, /compatibility, /products)
│   │   ├── components/                  # Design system components (UnifiedShoppingExperience, etc.)
│   │   ├── context/                     # CompatibilityContext for owned & candidate items
│   │   └── lib/                         # Typed API client, normalizers, canvas preprocessor
│   └── tests/                           # 25 Vitest unit, contract, and component tests
├── mock_ml_service.py                   # Standalone FashionCLIP + FAISS microservice (port 8001)
├── run_all.py                           # Full stack orchestrator (ML + Backend + Frontend)
├── build_vector_index.py                # FashionCLIP vector index generator CLI
├── benchmark_clip.py                    # FashionCLIP latency & retrieval accuracy benchmark
├── requirements.txt                     # Pinned project dependencies
├── .env.example                         # Environment configuration template
└── README.md                            # Comprehensive documentation
```

---

## 4. Setup & Installation

### Step 1: Install Python Dependencies

Using standard Python 3.11+:

```powershell
pip install -r requirements.txt
```

Key dependencies include:
* `open-clip-torch>=2.24.0` (for Marqo FashionCLIP)
* `faiss-cpu>=1.7.0` (for dense vector search)
* `torch>=2.0.0`
* `fastapi>=0.115.0`

### Step 2: Install Frontend Dependencies

```powershell
cd frontend
npm install
cd ..
```

### Step 3: Configure Environment

Copy the example environment configuration:

```powershell
copy .env.example .env
```

Key settings in `.env`:
| Key | Default | Description |
|---|---|---|
| `CLIP_MODEL_ID` | `hf-hub:Marqo/marqo-fashionCLIP` | FashionCLIP Hugging Face Hub model identifier |
| `CLIP_DEVICE` | `auto` | Inference device (`auto`, `cpu`, or `cuda`) |
| `VECTOR_INDEX_PATH` | `backend/app/services/fashionclip_fashion.index` | Path to persistent FashionCLIP FAISS index |
| `VECTOR_METADATA_PATH` | `backend/app/services/fashionclip_fashion_meta.json` | Path to vector metadata JSON |
| `DATABASE_URL` | `sqlite:///./smart_visual_shopping.db` | SQLite database connection string |
| `ML_SERVICE_URL` | `http://localhost:8001` | Base URL of the FashionCLIP microservice |
| `MAX_UPLOAD_SIZE_BYTES` | `10485760` | Maximum upload size (10 MB) |

---

## 5. Running the Application

### One-Command Full Stack Startup

To start the ML service (port 8001), FastAPI backend (port 8000), and Next.js frontend (port 3000) simultaneously:

```powershell
py run_all.py
```

### Individual Service Commands

* **AI/ML Service (port 8001):**
  ```powershell
  py -m uvicorn mock_ml_service:app --host 127.0.0.1 --port 8001
  ```
* **FastAPI Backend (port 8000):**
  ```powershell
  py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
* **Next.js Frontend (port 3000):**
  ```powershell
  cd frontend
  npm run dev
  ```

### Service Access URLs

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Backend Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **AI/ML Service Health**: [http://127.0.0.1:8001/internal/health](http://127.0.0.1:8001/internal/health)

---

## 6. Marqo FashionCLIP & Vector Search

The visual search engine uses **`Marqo/marqo-fashionCLIP`** via OpenCLIP for fashion, apparel, and accessory retrieval.

### How It Works

1. **Model Loading**: The model is loaded once on service startup in evaluation mode with inference optimizations (`open_clip.create_model_and_transforms("hf-hub:Marqo/marqo-fashionCLIP")`).
2. **Preprocessing**: Images pass through Pillow safety verification (protection against decompression bombs) before applying FashionCLIP's official preprocessing transforms.
3. **512-Dimensional L2 Normalization**: Output vectors are L2-normalized so inner product searches directly yield cosine similarity.
4. **FAISS Retrieval**: `IndexFlatIP(512)` retrieves nearest visual neighbors.
5. **Multi-Image Deduplication**: When a product has multiple images, scores are aggregated by taking the **maximum similarity score** per product ID so no duplicate cards appear.
6. **Cross-Modal Fallbacks**: If an image URL is inaccessible, the indexer extracts a text embedding from the product's brand, name, and category in the identical 512-d latent space.

### Rebuilding the Index

To rebuild the FashionCLIP FAISS index from the database catalog:

```powershell
py build_vector_index.py
```

### Benchmarking FashionCLIP

Run the built-in benchmark to evaluate inference latency and retrieval accuracy:

```powershell
py benchmark_clip.py
```

Benchmark output on CPU:
- **Mean Image Inference Latency:** `~300 ms`
- **Mean Text Inference Latency:** `~83 ms`
- **Top-1 / Recall@5 / Recall@10:** Evaluated across categories with verified matching

---

## 7. Automated Testing Suite

### Backend Tests (72 Passing Tests)

Run the complete backend test suite:

```powershell
py -m pytest backend/tests/
```

Test coverage includes:
* `test_clip_service.py` (11 tests): FashionCLIP singleton, embedding dimensions, L2 normalization, text embeddings, batch extraction, error boundaries.
* `test_fashionclip_faiss.py` (12 tests): Index creation, save/load, ID mapping, incremental indexing, empty catalog, invalid image rejection.
* `test_clip_integration.py` (10 tests): End-to-end visual search pipeline, more-like-this, ML health.
* `test_compatibility.py` (11 tests): Category pair compatibility verdicts.
* `test_faiss_engine.py` (7 tests): FAISS multi-image score aggregation.
* `test_products.py` (5 tests): Catalog pagination, category filtering, search.
* `test_rules_engine.py` (4 tests): Deterministic rules verification.
* `test_visual_search.py` (5 tests): API route validation.
* `test_ml_client.py` (5 tests): Client timeout and resilience.
* `test_health.py` (2 tests): Health check contracts.

### Frontend Tests (25 Passing Tests)

Run the Vitest frontend test suite:

```powershell
cd frontend
npm test
```

Test coverage includes:
* `Selection.test.tsx` (5 tests): ProductCard click-to-select and click-again-to-deselect, `aria-pressed`, score badge, FilterChips single and multi-select.
* `ResultView.test.tsx` (5 tests): All 4 verdict text labels (`Compatible`, `Partly compatible`, `Not compatible`, `Not enough information`), evidence rendering, and missing specs.
* `backendContract.test.ts` (3 tests): Strict parsing of backend responses.
* `normalize.test.ts` (10 tests): Strict verdict normalization and `ParseError` on invalid payloads.
* `ImageUploader.test.tsx` (2 tests): File format validation, rejection of unsupported types (e.g. PDF).

---

## 8. Summary of Implemented Compatibility Rules

| Category Pair | Properties Evaluated | Deterministic Outcome |
|---|---|---|
| **Charger ↔ Device** | `output_ports`, `charging_protocols`, `max_output_wattage_w`, `min_recommended_charger_w` | Fails if ports cannot mate or wattage < device minimum. Warns if below fast-charging rate. |
| **Cable ↔ Device** | `source_connector`, `target_connector`, `max_supported_wattage_w`, `mfi_certified` | Fails if connector ends do not mate (e.g. USB-C vs Lightning). Warns if cable wattage throttles power. |
| **Monitor ↔ Computer** | `video_inputs`, `video_out_support`, `usb_c_power_delivery_w` | Validates DP Alt Mode / HDMI match. Verifies monitor reverse PD satisfies laptop wattage. |
| **Smartwatch ↔ Phone** | `compatible_os`, `min_os_version`, `bluetooth_version` | Enforces iOS vs Android ecosystem boundaries. Checks OS release version numbers. |
| **Case ↔ Phone** | `target_device_model`, `dimensions_mm` | Validates exact model name match and sub-millimeter physical dimension tolerance. |
| **Audio ↔ Device** | `bluetooth_version`, `headphone_jack_3_5mm`, `bluetooth_codecs` | Verifies Bluetooth radio and validates 3.5mm jack requirement against host chassis. |
| **Missing Specs** | Any required technical attribute | Emits `cannot_verify` with explicit missing attribute notices; never guesses or hallucinates. |

---

## 9. Visual Search & Compatibility API Endpoints

### Visual Search: `POST /api/visual-search`
Uploads an image, extracts FashionCLIP visual embedding, and returns ranked products with similarity scores and explanations.

```bash
curl -X POST "http://localhost:8000/api/visual-search?limit=5" \
  -F "file=@query_photo.jpg;type=image/jpeg"
```

### Visual Neighbors: `GET /api/visual-search/more-like-this/{id}`
Returns visually similar catalog recommendations excluding the query product itself.

```bash
curl -X GET "http://localhost:8000/api/visual-search/more-like-this/prod_apple_iphone_15_pro?limit=4"
```

### Compatibility Evaluation: `POST /api/compatibility/check`
Evaluates technical compatibility between two products using the deterministic rules engine.

```bash
curl -X POST "http://localhost:8000/api/compatibility/check" \
  -H "Content-Type: application/json" \
  -d '{
    "existing_product_id": "prod_apple_iphone_15_pro",
    "candidate_product_id": "prod_anker_lightning_cable_mfi"
  }'
```

### Identify Owned Device: `POST /api/compatibility/identify-photo`
Identifies the user's existing device from a photo to automatically populate Slot 1 in the compatibility checker.

```bash
curl -X POST "http://localhost:8000/api/compatibility/identify-photo" \
  -F "file=@my_device.jpg;type=image/jpeg"
```
