# RS Moto Taxi — Driver PWA (v2)

Zewnętrzna aplikacja kierowcy (Vercel). Przeglądarka gada **tylko z Next.js**; Next (BFF) woła Open Mercato.

```
Browser ──same-origin──▶ Next /api/* ──server──▶ OM /api/taxi_fleet/driver-app/v2/*
```

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind 4 + Yarn 4
- Design: `docs/design-handoff/`
- BFF: `src/app/api/auth/*`, `src/app/api/om/[...path]`
- Client: `src/lib/om/` → `/api/...` (bez CORS do OM)

## Auth (trwała sesja)

- Login: `POST /api/auth/login` → OM `driver-app/v2/auth/login`
- Tokeny w **HttpOnly cookies** na domenie Vercel (`om_access_token`, `om_refresh_token`)
- Proxy przy 401 odświeża sesję przez OM `/api/auth/session/refresh`
- Brak checkboxa „zapamiętaj”; refresh zawsze

## Dev

```bash
cp .env.example .env.local
# OM_API_BASE=http://localhost:3000

. ~/.nvm/nvm.sh && nvm use
yarn dev
```

CORS po stronie OM **nie jest wymagany** dla przeglądarki (serwer Next → OM).

## Deploy (Vercel)

1. Env: `OM_API_BASE`, `NEXT_PUBLIC_APP_VERSION`, opcjonalnie `REMEMBER_ME_DAYS`
2. Cookies: `Secure` w production (`NODE_ENV=production`)

## QA

Patrz `docs/QA-CHECKLIST.md`.
