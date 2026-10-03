# Balconia

Balcony makeovers and curated decor shop for India. Next.js 14 (App Router), Tailwind, UPI checkout, Vercel-ready.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local` (and set the same vars in Vercel):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (e.g. `https://balconia.in`) |
| `NEXT_PUBLIC_WHATSAPP` | WhatsApp number with country code (e.g. `9198XXXXXXXX`) |
| `NEXT_PUBLIC_UPI_ID` | UPI ID shown at checkout |
| `NEXT_PUBLIC_UPI_NAME` | Payee name for UPI |

## Deploy on Vercel

1. Import this GitHub repo in [Vercel](https://vercel.com/new).
2. Framework preset: **Next.js** (auto-detected).
3. Add the env vars above.
4. Deploy.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
