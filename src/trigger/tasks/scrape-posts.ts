import { createHash } from "node:crypto";
import { task } from "@trigger.dev/sdk/v3";
import {
  apifyGetDatasetItems,
  apifyRunActor,
  apifyWaitForRunCompletion,
  asNumber,
  asString,
  closeJob,
  getSupabaseAdmin,
} from "./helpers";

/** Prefer Instagram shortcode; otherwise id, URL parse, or stable hash — never drop rows for missing shortCode. */
function platformPostIdFromApifyItem(post: Record<string, unknown>): string {
  const direct =
    asString(post.shortCode) ??
    asString(post.shortcode) ??
    asString(post.code);
  if (direct) return direct;

  const idVal = post.id;
  if (typeof idVal === "string" && idVal.trim()) return idVal.trim();
  if (typeof idVal === "number" && Number.isFinite(idVal)) return String(Math.trunc(idVal));

  for (const key of ["url", "link", "permalink"] as const) {
    const url = asString(post[key]);
    if (url) {
      const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/i);
      if (m?.[1]) return m[1];
    }
  }

  return `hash_${createHash("sha256").update(JSON.stringify(post)).digest("hex").slice(0, 24)}`;
}

export type ScrapePostsPayload = {
  surfaceId: string;
  username: string;
  maxPosts?: number;
  jobId?: string;
};

export type ScrapePostsResult = {
  postIds: string[];
};

export const scrapePostsTask = task({
  id: "scrape-posts",
  run: async (payload: ScrapePostsPayload): Promise<ScrapePostsResult> => {
    try {
    const supabase = getSupabaseAdmin();
    const run = await apifyRunActor("apify~instagram-post-scraper", {
      username: [`https://www.instagram.com/${payload.username}/`],
      resultsLimit: payload.maxPosts ?? 30,
      skipPinnedPosts: false,
      dataDetailLevel: "basicData" as const,
    });

    await apifyWaitForRunCompletion(run.runId);
    const items = await apifyGetDatasetItems(run.datasetId);

    const rows = items
      .map((item) => {
        const post = item as Record<string, unknown>;
        const platformPostId = platformPostIdFromApifyItem(post);
        return {
          platform_post_id: platformPostId,
          surface_id: payload.surfaceId,
          caption: asString(post.caption),
          like_count: asNumber(post.likesCount) ?? 0,
          comments_count: asNumber(post.commentsCount) ?? 0,
          view_count: asNumber(post.videoViewCount),
          posted_at: asString(post.timestamp),
          scraped_at: new Date().toISOString(),
          latest_comments: { data: (post.latestComments as unknown) ?? [] },
        };
      });

    if (rows.length > 0) {
      const { error } = await supabase.from("posts").upsert(rows, {
        onConflict: "platform_post_id",
      });
      if (error) throw error;
    }

    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("surface_id", payload.surfaceId)
      .in(
        "platform_post_id",
        rows.map((row) => row.platform_post_id),
      );
    if (postError) throw postError;

    const { error: surfaceError } = await supabase
      .from("surfaces")
      .update({ last_scraped_at: new Date().toISOString(), status: "active" })
      .eq("id", payload.surfaceId);
    if (surfaceError) throw surfaceError;

    const result = { postIds: (postData ?? []).map((row) => (row as { id: string }).id) };
    if (payload.jobId) await closeJob(payload.jobId, "completed");
    return result;
    } catch (err) {
      if (payload.jobId) await closeJob(payload.jobId, "failed", (err as Error).message);
      throw err;
    }
  },
});
