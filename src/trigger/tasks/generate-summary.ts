import { task } from "@trigger.dev/sdk/v3";
import { asString, closeJob, getSupabaseAdmin, openAiJson } from "./helpers";

export type GenerateSummaryPayload = {
  postId: string;
  jobId?: string;
};

export type GenerateSummaryResult = {
  title: string;
  summary: string;
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
  run: async (payload: GenerateSummaryPayload): Promise<GenerateSummaryResult> => {
    try {
    const supabase = getSupabaseAdmin();
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, caption")
      .eq("id", payload.postId)
      .single();
    if (postError) throw postError;

    const { data: signals, error: signalsError } = await supabase
      .from("signals")
      .select("text, urgency_score, intent_label")
      .eq("post_id", payload.postId)
      .order("urgency_score", { ascending: false })
      .limit(5);
    if (signalsError) throw signalsError;

    const summary = await openAiJson(
      "You are Tower's post analyzer. Return strict JSON only.",
      `Post caption: ${(post as { caption: string | null }).caption ?? ""}\nTop signals: ${JSON.stringify(
        signals ?? [],
      )}\nReturn {"title": string, "read": string}.`,
      summaryGuard,
    );

    const { error: updateError } = await supabase
      .from("posts")
      .update({ title: summary.title, ai_summary: summary.read })
      .eq("id", payload.postId);
    if (updateError) throw updateError;

    const result = { title: summary.title, summary: summary.read };
    if (payload.jobId) await closeJob(payload.jobId, "completed");
    return result;
    } catch (err) {
      if (payload.jobId) await closeJob(payload.jobId, "failed", (err as Error).message);
      throw err;
    }
  },
});
