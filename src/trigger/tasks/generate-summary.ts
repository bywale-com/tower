import { task } from "@trigger.dev/sdk/v3";
import { asString, getSupabaseAdmin, openAiJson } from "./helpers";

type PostSummaryRow = {
  id: string;
  caption: string | null;
  url: string | null;
  surface_username: string | null;
};

export type GenerateSummaryInput = {
  postIds?: string[];
  limit?: number;
};

export type GenerateSummaryOutput = {
  postsProcessed: number;
  postsUpdated: number;
};

type SummaryPayload = {
  title: string;
  read: string;
};

function summaryGuard(payload: Record<string, unknown>): SummaryPayload {
  return {
    title: asString(payload.title) ?? "Untitled Post",
    read: asString(payload.read) ?? "No summary generated.",
  };
}

export const generateSummaryTask = task({
  id: "generate-summary",
  run: async (payload: GenerateSummaryInput): Promise<GenerateSummaryOutput> => {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("posts")
      .select("id, caption, url, surface_username")
      .is("ai_summary", null)
      .gt("analyzed_signal_count", 0);
    if (payload.postIds && payload.postIds.length > 0) query = query.in("id", payload.postIds);
    const { data, error } = await query.limit(payload.limit ?? 50);
    if (error) throw error;

    const posts = (data ?? []) as PostSummaryRow[];
    let postsUpdated = 0;

    for (const post of posts) {
      const { data: signals } = await supabase
        .from("signals")
        .select("text, urgency_score, intent_label")
        .eq("post_id", post.id)
        .order("urgency_score", { ascending: false })
        .limit(5);

      const summary = await openAiJson(
        "You are Tower's post analyzer. Return concise JSON only.",
        `Post caption: ${post.caption ?? ""}\nPost url: ${post.url ?? ""}\nSurface username: ${
          post.surface_username ?? ""
        }\nTop signals: ${JSON.stringify(signals ?? [])}\nReturn {"title": "10-word title", "read": "brief analytic read"}.`,
        summaryGuard,
      );

      const { error: updateError } = await supabase
        .from("posts")
        .update({ title: summary.title, ai_summary: summary.read })
        .eq("id", post.id);
      if (!updateError) postsUpdated += 1;
    }

    return { postsProcessed: posts.length, postsUpdated };
  },
});
