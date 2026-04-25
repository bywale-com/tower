import { task } from "@trigger.dev/sdk/v3";
import { apifyGetDatasetItems, apifyRunActor, asNumber, asString, getSupabaseAdmin } from "./helpers";

type Surface = { id: string; username: string | null; url: string | null };

export type ScrapePostsInput = {
  surfaceIds?: string[];
  resultsLimit?: number;
};

export type ScrapePostsOutput = {
  surfacesProcessed: number;
  postsUpserted: number;
};

export const scrapePostsTask = task({
  id: "scrape-posts",
  run: async (payload: ScrapePostsInput): Promise<ScrapePostsOutput> => {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("surfaces").select("id, username, url").eq("status", "active");
    if (payload.surfaceIds && payload.surfaceIds.length > 0) {
      query = query.in("id", payload.surfaceIds);
    }

    const { data, error } = await query.limit(50);
    if (error) throw error;
    const surfaces = (data ?? []) as Surface[];
    let postsUpserted = 0;

    for (const surface of surfaces) {
      const username = surface.username ?? surface.url;
      if (!username) continue;

      const run = await apifyRunActor("apify~instagram-post-scraper", {
        username: [username],
        resultsLimit: payload.resultsLimit ?? 500,
        skipPinnedPosts: false,
        dataDetailLevel: "detailedData",
        onlyPostsNewerThan: "2 years",
      });
      const items = await apifyGetDatasetItems(run.datasetId);

      const rows = items
        .map((item) => {
          const record = item as Record<string, unknown>;
          const postId = asString(record.id) ?? asString(record.shortCode);
          if (!postId) return null;
          return {
            surface_id: surface.id,
            platform_post_id: postId,
            platform: "instagram",
            url: asString(record.url),
            caption: asString(record.caption),
            thumbnail_url: asString(record.displayUrl),
            video_url: asString(record.videoUrl),
            like_count: asNumber(record.likesCount),
            comments_count: asNumber(record.commentsCount),
            view_count: asNumber(record.videoViewCount),
            posted_at: asString(record.timestamp),
            latest_comments: record.latestComments ?? null,
            scraped_at: new Date().toISOString(),
            surface_username: surface.username,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));

      if (rows.length > 0) {
        const { error: upsertError } = await supabase.from("posts").upsert(rows, {
          onConflict: "platform_post_id",
        });
        if (upsertError) throw upsertError;
        postsUpserted += rows.length;
      }

      await supabase
        .from("surfaces")
        .update({ scrape_job_url: run.runId, last_scraped_at: new Date().toISOString() })
        .eq("id", surface.id);
    }

    return { surfacesProcessed: surfaces.length, postsUpserted };
  },
});
