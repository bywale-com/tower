"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function logSearch(queryString: string) {
  if (!queryString.trim()) return;
  const supabase = createServiceClient();
  await supabase.from("search_logs").insert({ query_string: queryString.trim() });
}

export async function logEnrichRequest(keyword: string) {
  if (!keyword.trim()) return;
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("searches")
    .select("id, run_count")
    .eq("keyword", keyword.trim().toLowerCase())
    .maybeSingle();

  if (existing) {
    await supabase
      .from("searches")
      .update({ run_count: (existing.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("searches")
      .insert({ keyword: keyword.trim().toLowerCase(), status: "pending", run_count: 1 });
  }

  // Also log the raw query
  await supabase.from("search_logs").insert({ query_string: keyword.trim() });
}
