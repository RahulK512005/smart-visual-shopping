# Smart Visual Shopping: Frontend

Team 2 · VYUMI 20-day prototype sprint · Frontend developer deliverable.

## What it does
- **Log in / Register**, with role-based UI (`shopper` sees the shopping tool; `admin` also sees the Catalog page).
- **Find similar**: upload an image, see a preview, get the top 6 similar products with price, match % and a reason. "More like this" re-searches from any result.
- **Check with mine**: upload a photo of what you own (or pick it from the catalog), pick the product you want, get a verdict: Compatible, Partly compatible, Not compatible, Not enough information, with reasons and exactly what is missing.
- Live job status (WebSocket, with automatic polling fallback), client-side validation, loading states, friendly errors with a **Try again** button.

## Inputs / outputs
Inputs: image files (JPG/PNG/WebP, max 8 MB, min 128 px), catalog selections, optional connector/width details.
Outputs: ranked products with AI-estimated scores; compatibility verdict with checks. See `docs/API_CONTRACT.md`.

## Local setup
Requires Node 18+.
```bash
cd frontend
npm install
cp .env.example .env     # skip if .env already exists
npm run dev              # http://localhost:5173
```

### Demo mode vs real backend
`.env` has `VITE_USE_MOCK=true` by default, so everything works with built-in sample data and no backend.
When the FastAPI backend is running (default `http://localhost:8000`):
1. Set `VITE_USE_MOCK=false` in `.env`.
2. If the backend is elsewhere, set `VITE_PROXY_TARGET`.
3. Restart `npm run dev`.

Demo accounts (mock only): `shopper@vyumi.test / shopper123`, `admin@vyumi.test / admin123`.
Test error states in mock mode: upload a file with `fail` in its name (error), or `nomatch` (no results).

## Run command / test command
```bash
npm run dev
npm test           # validation + mock rule-engine tests
npm run build      # typecheck + production build
```

## Project layout
```
src/api/          client.ts (fetch + auth), real.ts (FastAPI), mock.ts (fake data), jobs.ts (WebSocket/polling)
src/auth/         AuthContext, ProtectedRoute (role check)
src/pages/        Login, Register, Shop, SimilarMode, CompatMode, Admin
src/components/   ImageDropzone, ProductCard, ProductPicker, VerdictCard, ProgressPanel, ErrorBanner, Layout
src/hooks/        useJobRunner (idle→running→done|error), useProducts
src/utils/        validation, formatting + friendly error text
docs/API_CONTRACT.md   what the backend must provide
```

## Model(s) used
None in the frontend. Embeddings, FAISS and rules run in the backend.

## Known limitations
- Mock mode data is fake; real accuracy comes from the backend.
- Role is decided by the backend; the UI only hides/shows pages (the backend must enforce access too).
- Token is kept in `localStorage` (fine for a prototype, not for production).
- No i18n, no analytics, no checkout (out of scope for the sprint).

## License notes
Frontend uses React, React Router, Vite (all MIT). Fonts from Google Fonts (OFL).

## Troubleshooting
- *Blank page / network errors with mock off*: backend not running or wrong `VITE_PROXY_TARGET`.
- *WebSocket not connecting*: the app falls back to polling automatically; check the backend `/ws/jobs/{id}` route.
- *Logged out after refresh in mock mode*: only the two demo accounts persist; newly registered mock users reset on refresh.
