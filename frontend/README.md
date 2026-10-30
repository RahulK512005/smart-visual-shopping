# VYUMI Smart Visual Shopping — Frontend

Web client for **Feature 2: Smart Visual Shopping**. One experience, two modes:
**(A) Find similar** (upload an image, get the closest catalog products) and
**(B) Will it work with mine?** (pick what you own and what you want, get a verdict with reasons).

The frontend contains **no ML and no compatibility logic**. Rankings, scores and verdicts all come from the backend API. If the API fails, the user sees an error, never fake data.

## 1. Stack
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Vitest + React Testing Library.
No UI library and no state library: React state plus one small context (`CompatibilityContext`) for the two selected products.

## 2. Design system
- **Brand:** VYUMI ink `#0B0B14` + volt lime `#CBF542`, warm paper background, rounded cards, strong product imagery.
- **Type:** Bricolage Grotesque (headings) + DM Sans (body), loaded from Google Fonts with system fallbacks.
- **Motion:** scroll reveal, sliding mode switch, scanner animation on the uploaded photo, animated verdict. All of it respects `prefers-reduced-motion`.
- **Smooth scrolling:** global `scroll-behavior: smooth`, sticky blurred header, the page glides to results when they arrive, scroll-snap carousels, back-to-top button.
- **Select / deselect everywhere:** result cards, catalog pickers and filter chips all toggle. Click once to select, click again to deselect. Multi-select chips on results, single-select on catalog and pickers, "Clear filters", and a floating action bar for the selected product.
- **Accessibility:** semantic HTML, skip link, visible focus, `aria-pressed` on every toggle, text labels and icons on all verdicts (never colour alone), 44px+ tap targets.
- **Spec rules followed:** very short copy, one primary action per screen, demo inputs (sample photos), progress states, retry on every error, plain-language error messages, "AI-ranked" labels, four verdict labels (Compatible / Partly compatible / Not compatible / Not enough information).

## 3. Pages
| Route | What it does |
|---|---|
| `/` | Hero with the full experience, how-it-works, catalog carousel |
| `/search` | Same experience, opens in **Find similar** mode |
| `/compatibility` | Same experience, opens in **Will it work with mine?** mode |
| `/products` | Catalog: backend search, category filter, Load more |
| `/products/[id]` | Product details, specs, verification status, toggle "I own this" / "Will it work with mine?", More like this |

## 4. Structure
```
src/
├── app/                 pages (layout, home, search, compatibility, products)
├── components/
│   ├── UnifiedShoppingExperience.tsx   the two-mode experience
│   ├── ImageUploader / SampleStrip / ScanProgress
│   ├── ProductCard / ProductPicker / FilterChips / ProductImage
│   ├── ResultView / Verdict / SpecTable
│   └── Header / Logo / Reveal / ScrollTop / States
├── context/CompatibilityContext.tsx    selected products (sessionStorage)
└── lib/                 api.ts (all HTTP) · normalize.ts (safe parsing) · types · validation · useAsync
tests/                   25 tests
docs/API_CONTRACT.md     endpoints and fields used
```

## 5. Setup and run
Requires Node.js 18.18+.
```bash
cd frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm install
npm run dev                    # http://localhost:3000  (use localhost, not the 192.168 address: backend CORS)
```
Backend and mock ML service must be running (see the root README). Whole stack at once: `py run_all.py` from the repo root.

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest |

| Env variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Backend URL |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | `10` | Must match backend `MAX_UPLOAD_SIZE_BYTES` |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | `30000` | Request timeout |

## 6. API used
`GET /api/health` · `GET /api/products` (q, category, page, page_size) · `GET /api/products/{id}` · `POST /api/visual-search` (multipart `file`) · `GET /api/visual-search/more-like-this/{id}` · `POST /api/compatibility/check` · `POST /api/compatibility/identify-photo`.
Error handling covers network, timeout, HTTP errors (using the backend's message), and malformed or unknown responses. Unknown verdicts are rejected, not guessed.

## 7. Testing
`npm test` runs 25 tests: all four verdict labels, failed checks / missing specs / evidence rendering, select and deselect on cards and chips, parsing of the backend's real response shapes, malformed responses, and image validation.
Also verified: lint, type check, production build, and the API client against the live backend (320 products; compatible, incompatible and cannot_verify verdicts).

## 8. Known limitations
- Visual search quality depends on the ML service. `mock_ml_service.py` returns a fixed list for any image.
- "Sample photo" buttons fetch the catalog image in the browser; if an image host blocks it (CORS), a friendly message asks the user to upload their own.
- Step labels on the progress panels advance on a timer to show the stages; they are not measured progress.
- Login, registration, WebSockets and search history are not implemented: the backend has no endpoints for them.
- Fonts load from Google Fonts; offline, system fonts are used.
