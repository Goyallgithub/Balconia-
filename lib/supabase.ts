import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Supabase is not configured (URL + SERVICE_ROLE_KEY).");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function supabaseAnon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error("Supabase anon key is not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolve the signed-in user from Authorization: Bearer <access_token> or ?token=<access_token>. */
export async function userFromRequest(
  request: Request
): Promise<User | null> {
  const header = request.headers.get("authorization") || "";
  let token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    try {
      const url = new URL(request.url);
      token = url.searchParams.get("token")?.trim() || "";
    } catch {
      token = "";
    }
  }
  if (!token) return null;
  if (!supabaseConfigured()) {
    // In test or local offline environment without Supabase keys, support test tokens
    if (token.startsWith("test-token-")) {
      const userId = token.replace("test-token-", "");
      return { id: userId, email: `${userId}@test.com` } as User;
    }
    return null;
  }
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}


export const MAX_GENERATIONS_PER_USER = Number(
  process.env.MAX_GENERATIONS_PER_USER || "10"
);
