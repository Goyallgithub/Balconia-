# Supabase setup (do this once)

Project URL: `https://kqmagzfkwgujwgwrzbel.supabase.co`

## 1. Run schema

1. Open Supabase → **SQL Editor** → New query  
2. Paste everything from `supabase/schema.sql`  
3. Run  

This creates `profiles`, `balcony_designs`, `orders`, `makeover_consultations`, storage bucket `balcony-designs`, and RLS.

## 2. Auth settings

1. **Authentication → Providers** → enable **Email**  
2. For local testing you can disable “Confirm email” under **Authentication → Providers → Email** (re-enable for production).

## 3. Keys → `.env.local`

From **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://kqmagzfkwgujwgwrzbel.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # anon public
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # service_role — server only, never commit
```

Also keep:

```
MAX_GENERATIONS_PER_USER=2
OPENAI_IMAGE_MAX_GENERATIONS=2
```

## 4. Restart

```bash
npm run dev
```

## 5. Optional order email

Create a [Resend](https://resend.com) key and set `RESEND_API_KEY` + `ORDER_EMAIL_FROM`. Without it, orders still save; emails are skipped.

## OpenAI caution

Each AI image costs money. Cap is **2 completed images per signed-in user**. Global `OPENAI_IMAGE_MAX_GENERATIONS=2` is an extra safety net on your personal key until the client provides theirs.
