# Balconia

Frontend from the GPT export (static site in `public/`) plus a minimal Next.js API for AI balcony previews via Leonardo.AI (`nano-banana-2`).

## Local

```bash
npm install
cp .env.example .env.local
# set LEONARDO_API_KEY in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Static pages: `/`, `/catalogue.html`, `/cart.html`, `/checkout.html`.  
API: `POST /api/designs`, `POST /api/designs/:id/generate`, image routes under `/api/designs/:id/image`.

## Vercel

1. Import this GitHub repo (Next.js).
2. Add secret **`LEONARDO_API_KEY`** (server-only).
3. Deploy.

Customer photos are stored under `data/designs/` locally (gitignored). On Vercel the filesystem is ephemeral — for production persistence later, attach Blob/S3 storage.

## Leonardo

- Model: `nano-banana-2`
- Private 1024×1024 generation, `prompt_enhance: OFF`
- Balcony photo = reference 1 (HIGH); up to 5 catalogue product photos as further references (MID)
- Prices are calculated from catalogue `pricePaise` only — never by the image model

Never put `LEONARDO_API_KEY` in browser code or `NEXT_PUBLIC_*` vars.
