"use server";

import { createClient } from "@/lib/supabase/server";

export async function logSearch(queryString: string) {
  if (!queryString.trim()) return;
  const supabase = createClient();
  await supabase.from("search_logs").insert({ query_string: queryString.trim() });
}
