import { task } from "@trigger.dev/sdk/v3";
import { asNumber, getSupabaseAdmin } from "./helpers";

export type RecomputePayload = {
  topicId: string;
};

export type RecomputeResult = {
  topicUrgencyScore: number;
  surfacesUpdated: number;
};

export const recomputeScoresTask = task({
  id: "recompute-scores",
  run: async (payload: RecomputePayload): Promise<RecomputeResult> => {
    const supabase = getSupabaseAdmin();
    const { data: surfaces, error: surfacesError } = await supabase
      .from("surfaces")
      .select("id")
      .eq("topic_id", payload.topicId);
    if (surfacesError) throw surfacesError;

    let surfacesUpdated = 0;
    const urgencyScores: number[] = [];

    for (const row of surfaces ?? []) {
      const surfaceId = (row as { id: string }).id;
      const { data: surfaceSignals, error: signalsError } = await supabase
        .from("signals")
        .select("urgency_score, posts!inner(surface_id)")
        .eq("posts.surface_id", surfaceId);
      if (signalsError) throw signalsError;

      const values = (surfaceSignals ?? [])
        .map((signal) => asNumber((signal as { urgency_score?: unknown }).urgency_score))
        .filter((value): value is number => value !== null);
      const surfaceUrgencyScore =
        values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      urgencyScores.push(surfaceUrgencyScore);

      const { error: updateSurfaceError } = await supabase
        .from("surfaces")
        .update({ urgency_score: surfaceUrgencyScore })
        .eq("id", surfaceId);
      if (updateSurfaceError) throw updateSurfaceError;
      surfacesUpdated += 1;
    }

    const topicUrgencyScore =
      urgencyScores.length > 0
        ? urgencyScores.reduce((sum, value) => sum + value, 0) / urgencyScores.length
        : 0;

    const { error: topicUpdateError } = await supabase
      .from("topics")
      .update({
        urgency_score: topicUrgencyScore,
        status: "active",
        enriched_at: new Date().toISOString(),
      })
      .eq("id", payload.topicId);
    if (topicUpdateError) throw topicUpdateError;

    return { topicUrgencyScore, surfacesUpdated };
  },
});
