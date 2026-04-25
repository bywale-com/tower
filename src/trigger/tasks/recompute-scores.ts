import { task } from "@trigger.dev/sdk/v3";
import { asNumber, getSupabaseAdmin } from "./helpers";

type PostScoreRow = {
  id: string;
  surface_id: string | null;
  like_count: number | null;
  comments_count: number | null;
  view_count: number | null;
};

type SurfaceAggregate = {
  followers: number | null;
};

export type RecomputeScoresInput = {
  postIds?: string[];
  limit?: number;
};

export type RecomputeScoresOutput = {
  postsUpdated: number;
  surfacesUpdated: number;
};

export const recomputeScoresTask = task({
  id: "recompute-scores",
  run: async (payload: RecomputeScoresInput): Promise<RecomputeScoresOutput> => {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("posts").select("id, surface_id, like_count, comments_count, view_count");
    if (payload.postIds && payload.postIds.length > 0) query = query.in("id", payload.postIds);
    const { data, error } = await query.limit(payload.limit ?? 200);
    if (error) throw error;

    const posts = (data ?? []) as PostScoreRow[];
    let postsUpdated = 0;
    const touchedSurfaceIds = new Set<string>();

    for (const post of posts) {
      const { data: signals } = await supabase
        .from("signals")
        .select("urgency_score")
        .eq("post_id", post.id);
      const urgencyValues = (signals ?? [])
        .map((s) => asNumber((s as { urgency_score?: unknown }).urgency_score))
        .filter((v): v is number => typeof v === "number");
      const analyzedSignalCount = urgencyValues.length;
      const avgUrgency =
        analyzedSignalCount === 0
          ? null
          : urgencyValues.reduce((acc, value) => acc + value, 0) / analyzedSignalCount;
      const highUrgencyCount = urgencyValues.filter((value) => value >= 70).length;
      const engagementBase = (post.view_count ?? 0) > 0 ? (post.view_count ?? 0) : 1;
      const engagementRate = ((post.like_count ?? 0) + (post.comments_count ?? 0)) / engagementBase;

      const { error: updateError } = await supabase
        .from("posts")
        .update({
          urgency_score: avgUrgency,
          analyzed_signal_count: analyzedSignalCount,
          high_urgency_signal_count: highUrgencyCount,
          engagement_rate: engagementRate,
        })
        .eq("id", post.id);
      if (!updateError) {
        postsUpdated += 1;
        if (post.surface_id) touchedSurfaceIds.add(post.surface_id);
      }
    }

    let surfacesUpdated = 0;
    for (const surfaceId of touchedSurfaceIds) {
      const [{ data: surface }, { data: scoredPosts }, { data: signals }] = await Promise.all([
        supabase.from("surfaces").select("followers").eq("id", surfaceId).maybeSingle(),
        supabase
          .from("posts")
          .select("urgency_score")
          .eq("surface_id", surfaceId)
          .not("urgency_score", "is", null),
        supabase.from("signals").select("id").eq("surface_id", surfaceId),
      ]);

      const followers = asNumber((surface as SurfaceAggregate | null)?.followers) ?? 0;
      const urgencyValues = (scoredPosts ?? [])
        .map((post) => asNumber((post as { urgency_score?: unknown }).urgency_score))
        .filter((value): value is number => typeof value === "number");
      const avgUrgency =
        urgencyValues.length > 0
          ? urgencyValues.reduce((acc, value) => acc + value, 0) / urgencyValues.length
          : 0;
      const totalSignals = (signals ?? []).length;
      const incumbencyScore = Math.round(Math.min(100, avgUrgency * 0.7 + Math.log10(followers + 1) * 10));

      const { error: surfaceUpdateError } = await supabase
        .from("surfaces")
        .update({
          avg_urgency_score: avgUrgency,
          total_signals_generated: totalSignals,
          incumbency_score: incumbencyScore,
        })
        .eq("id", surfaceId);

      if (!surfaceUpdateError) surfacesUpdated += 1;
    }

    return { postsUpdated, surfacesUpdated };
  },
});
