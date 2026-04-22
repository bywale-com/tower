import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import "server-only";

/**
 * Creates a Supabase client for use in Server Components and Route Handlers.
 * Uses the service role key in server-only contexts so app data can be fetched
 * securely while public/anon API access remains blocked by RLS.
 * Call this inside an async Server Component; do not cache the instance.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
    );
  }

  const cookieStore = cookies();

  return createServerClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from Server Components where cookies can't be
            // mutated. Safe to ignore — middleware handles session refresh.
          }
        },
      },
    }
  );
}
