# Classic Indian Journeys: Web

React 18 + Vite + Tailwind frontend. See the [root README](../README.md) for full setup.

## Quick reference

```bash
npm install
npm run dev       # Vite dev server on :3000 (proxies /api -> :8000)
npm run build     # production build to dist/
npm run preview   # preview the production build
```

`VITE_BACKEND_URL` overrides the API origin (defaults to the `/api/v1` dev proxy). Custom
design system lives under the `ds-*` Tailwind utilities; admin panel under `src/admin/`.
