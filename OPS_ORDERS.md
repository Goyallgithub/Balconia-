# Soft-launch order ops (Lane A)

## Who checks new orders daily
**You** — `goyallbhavy@gmail.com` gets an `[Ops] Balconia order …` email on every COD request.

Also open Supabase → Table Editor → `orders` if you need full JSON (customer, items, coverage).

Later: switch `ORDER_EMAIL_OPS` to `care@balconia.in` (and/or client inboxes) after Resend domain verify.

## What an “order” is today
Cash on Delivery **request** only. No online payment. Statuses:
- `pending_confirmation` — DIY product request
- `pending_service_quote` — makeover quote request

Confirm availability, delivery charge, then call/WhatsApp the customer.

## Email setup (Resend)
Until you verify `balconia.in` on [resend.com/domains](https://resend.com/domains):
- `ORDER_EMAIL_FROM=Balconia <onboarding@resend.dev>`
- Can only send to the Resend **account** email (`goyallbhavy@gmail.com` on this key)

After domain verify:
- `ORDER_EMAIL_FROM=Balconia <orders@balconia.in>` (or `care@…`)
- `ORDER_EMAIL_OPS=care@balconia.in` (add `baygoyal10@gmail.com` if needed)

## Vercel env checklist
Set these on the Production project (same values as `.env.local`, except site URL):

```
NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
IMAGE_PROVIDER=openai
OPENAI_IMAGE_MODEL=
OPENAI_IMAGE_QUALITY=high
OPENAI_IMAGE_SIZE=1024x1536
OPENAI_IMAGE_MAX_GENERATIONS=2
MAX_GENERATIONS_PER_USER=2
RESEND_API_KEY=
ORDER_EMAIL_FROM=Balconia <onboarding@resend.dev>
ORDER_EMAIL_OPS=goyallbhavy@gmail.com
NEXT_PUBLIC_WHATSAPP=918448528555
```
