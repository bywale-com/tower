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
      directUrls: [`https://www.instagram.com/${payload.username}/`],
      resultsLimit: payload.maxPosts ?? 30,
    });

    await apifyWaitForRunCompletion(run.runId);
    const items = await apifyGetDatasetItems(run.datasetId);

    const rows = items
      .map((item) => {
        const post = item as Record<string, unknown>;
        const platformPostId = asString(post.shortCode) ?? asString(post.shortcode);
        if (!platformPostId) return null;
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
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

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
