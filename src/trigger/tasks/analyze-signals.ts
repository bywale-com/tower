import { task } from "@trigger.dev/sdk/v3";
import { asNumber, asString, getSupabaseAdmin, openAiJson } from "./helpers";

type PostRow = { id: string; surface_id: string; caption: string | null; latest_comments: unknown; surfaces: { username: string | null } | null };

type SignalClassification = {
  comment: string;
  is_signal: boolean;
  urgency_score: number;
  intent_label: "question" | "frustration" | "seeking_help" | "sharing_experience" | "other";
  is_answered: "true" | "false" | "privated";
};

export type AnalyzeSignalsPayload = {
  postId: string;
};

export type AnalyzeSignalsResult = {
  signalCount: number;
  highUrgencyCount: number;
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

function extractComments(
  raw: unknown,
): Array<{ text: string; commenter_username: string | null; commented_at: string | null; replies: unknown }> {
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
  run: async (payload: AnalyzeSignalsPayload): Promise<AnalyzeSignalsResult> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("posts")
      .select("id, surface_id, caption, latest_comments, surfaces(username)")
      .eq("id", payload.postId)
      .single();
    if (error) throw error;
    const post = data as unknown as PostRow;
    const ownerUsername = post.surfaces?.username ?? null;

    const comments = extractComments(post.latest_comments);
    const inserts: Array<{
      post_id: string;
      surface_id: string;
      text: string;
      commenter_username: string | null;
      urgency_score: number;
      intent_label: string;
      is_answered: "true" | "false" | "privated";
      commented_at: string | null;
    }> = [];

    for (const comment of comments) {
      if (ownerUsername && comment.commenter_username && ownerUsername === comment.commenter_username) {
        continue;
      }

      const classification = await openAiJson(
        "You are a signal classifier. Return JSON only.",
        `Caption: ${post.caption ?? ""}\nComment: ${comment.text}\nReply thread: ${JSON.stringify(
          comment.replies,
        )}\nCreator username: ${ownerUsername ?? ""}\nReturn {"comment": string, "is_signal": boolean, "urgency_score": number, "intent_label": "question|frustration|seeking_help|sharing_experience|other", "is_answered": "true|false|privated"}.`,
        classifyGuard,
      );

      if (!classification.is_signal) continue;
      inserts.push({
        post_id: post.id,
        surface_id: post.surface_id,
        text: classification.comment || comment.text,
        commenter_username: comment.commenter_username,
        urgency_score: classification.urgency_score,
        intent_label: classification.intent_label,
        is_answered: classification.is_answered,
        commented_at: comment.commented_at,
      });
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("signals").insert(inserts);
      if (insertError) throw insertError;
    }

    const highUrgencyCount = inserts.filter((signal) => signal.urgency_score >= 70).length;
    const { error: postUpdateError } = await supabase
      .from("posts")
      .update({
        analyzed_signal_count: inserts.length,
        high_urgency_signal_count: highUrgencyCount,
      })
      .eq("id", post.id);
    if (postUpdateError) throw postUpdateError;

    return { signalCount: inserts.length, highUrgencyCount };
  },
});
