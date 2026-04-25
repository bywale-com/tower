import { task } from "@trigger.dev/sdk/v3";
import { asNumber, asString, getSupabaseAdmin, openAiJson } from "./helpers";

type PostRow = {
  id: string;
  surface_id: string | null;
  caption: string | null;
  latest_comments: unknown;
  surface_username: string | null;
};

type SignalClassification = {
  comment: string;
  is_signal: boolean;
  urgency_score: number;
  intent_label: "question" | "frustration" | "seeking_help" | "sharing_experience" | "other";
  is_answered: "true" | "false" | "privated";
};

export type AnalyzeSignalsInput = {
  postIds?: string[];
  limit?: number;
};

export type AnalyzeSignalsOutput = {
  postsProcessed: number;
  signalsInserted: number;
};

function classifyGuard(payload: Record<string, unknown>): SignalClassification {
  const label = asString(payload.intent_label) ?? "other";
  const allowed = ["question", "frustration", "seeking_help", "sharing_experience", "other"];
  const answered = asString(payload.is_answered);
  return {
    comment: asString(payload.comment) ?? "",
    is_signal: payload.is_signal === true,
    urgency_score: Math.max(0, Math.min(100, asNumber(payload.urgency_score) ?? 0)),
    intent_label: (allowed.includes(label) ? label : "other") as SignalClassification["intent_label"],
    is_answered: answered === "true" || answered === "privated" ? answered : "false",
  };
}

function extractComments(raw: unknown): Array<{ text: string; commenter_username: string | null; commented_at: string | null; replies: unknown }> {
  if (!raw || typeof raw !== "object") return [];
  const data = (raw as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const record = item as Record<string, unknown>;
      const text = asString(record.text);
      if (!text) return null;
      return {
        text,
        commenter_username: asString(record.ownerUsername),
        commented_at: asString(record.timestamp),
        replies: record.replies ?? [],
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export const analyzeSignalsTask = task({
  id: "analyze-signals",
  run: async (payload: AnalyzeSignalsInput): Promise<AnalyzeSignalsOutput> => {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("posts")
      .select("id, surface_id, caption, latest_comments, surface_username")
      .not("latest_comments", "is", null);
    if (payload.postIds && payload.postIds.length > 0) query = query.in("id", payload.postIds);
    const { data, error } = await query.limit(payload.limit ?? 50);
    if (error) throw error;

    const posts = (data ?? []) as PostRow[];
    let signalsInserted = 0;

    for (const post of posts) {
      const comments = extractComments(post.latest_comments);
      for (const comment of comments) {
        if (
          post.surface_username &&
          comment.commenter_username &&
          post.surface_username === comment.commenter_username
        ) {
          continue;
        }

        const classification = await openAiJson(
          "You are a signal classifier. Return JSON only.",
          `Caption: ${post.caption ?? ""}\nComment: ${comment.text}\nReplyThread: ${JSON.stringify(
            comment.replies,
          )}\nPost creator username: ${post.surface_username ?? ""}\nReturn {"comment": string, "is_signal": boolean, "urgency_score": number, "intent_label": "question|frustration|seeking_help|sharing_experience|other", "is_answered": "true|false|privated"}.`,
          classifyGuard,
        );

        if (!classification.is_signal) continue;
        const { error: insertError } = await supabase.from("signals").insert({
          post_id: post.id,
          surface_id: post.surface_id,
          text: classification.comment || comment.text,
          commenter_username: comment.commenter_username,
          platform: "instagram",
          commented_at: comment.commented_at,
          urgency_score: classification.urgency_score,
          intent_label: classification.intent_label,
          is_answered: classification.is_answered,
          scraped_at: new Date().toISOString(),
        });
        if (!insertError) signalsInserted += 1;
      }
    }

    return { postsProcessed: posts.length, signalsInserted };
  },
});
