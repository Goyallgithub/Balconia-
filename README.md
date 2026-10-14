# Balconia

Client frontend from their latest export (`public/`) + **our** Next.js backend (Vercel-friendly).

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Static site in `public/` (copied from client export) |
| App host | **Next.js 14** → deploy on **Vercel** |
| Designs / AI images | Local/`data/designs` (ephemeral on Vercel unless you add Blob later) |
| Image model | **OpenAI** (`OPENAI_API_KEY`) |
| Orders / consultations | JSON files under `data/` for now (swap to Postgres/Blob when ready) |
| Pincode / coverage | `/api/serviceability` using their coverage config |

No Cloudflare Workers / D1 / R2 required to run or host.

## Local

```bash
npm install
cp .env.example .env.local   # set OPENAI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel

1. Import this GitHub repo (Next.js).
2. Set `OPENAI_API_KEY` (+ optional `ARCGIS_GEOCODING_API_KEY`).
3. Deploy.

Uploads on Vercel’s filesystem are ephemeral — for durable orders/photos later, add Blob/S3 + a database. See `CLIENT_BACKLOG.md`.
