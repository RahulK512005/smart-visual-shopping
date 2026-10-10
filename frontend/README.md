# Smart Visual Shopping - Frontend

Next.js (App Router) + TypeScript + Tailwind CSS. Contains **no** ML or compatibility logic: all results come from the backend API.

## Setup
```bash
cd frontend
cp .env.example .env.local     # set NEXT_PUBLIC_API_BASE_URL to the backend URL
npm install
npm run dev                    # http://localhost:3000
```

## Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest unit/component tests |

## Environment variables
`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_MAX_UPLOAD_MB` (match backend), `NEXT_PUBLIC_API_TIMEOUT_MS`.

## Pages
`/` home · `/search` visual search · `/products` catalog · `/products/[id]` details · `/compatibility` checker + results

## Structure
`src/lib/api.ts` (all HTTP calls) · `src/lib/normalize.ts` (response parsing) · `src/components` · `src/context` (selected products) · `docs/API_CONTRACT.md` (assumed backend contract)

## Known limitations
- Aligned with the backend code on `main` (see docs/API_CONTRACT.md) but not yet run end-to-end against a live backend + ML service.
- Catalog shows the first 100 products only (no pagination UI).
- Search history, login/registration and WebSockets are not implemented: the backend must provide those endpoints first.
- 
