/**
 * enrich-topic — Orchestrator task
 *
 * Coordinates the full enrichment pipeline for a topic:
 *   find-profiles → classify-and-create-surfaces
 *     → scrape-posts (fan-out per surface)
 *       → analyze-signals (fan-out per post)
 *       → generate-summary (fan-out per post)
 *   → recompute-scores
 *
 * This task owns all jobs table stage updates and fan-out tracking.
 * It calls the other tasks by name but never touches their internal logic.
 *
 * NOTE: This task is the Trigger.dev orchestrator entrypoint.
 */

import { task, tasks } from "@trigger.dev/sdk/v3";

import { createServiceClient } from "@/lib/supabase/server";
import type { FindProfilesResult } from "./find-profiles";
import type { ClassifyResult } from "./classify-and-create-surfaces";
import type { ScrapePostsResult } from "./scrape-posts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EnrichTopicPayload = {
  jobId: string;      // UUID of the jobs row created by /api/topics/enrich
  topicId: string;    // UUID of the topics row
  slug: string;       // e.g. "canada-immigration"
  query: string;      // original search query e.g. "canada immigration"
};

type Stage =
  | "queued"
  | "finding_creators"
  | "creating_surfaces"
  | "scraping_posts"
  | "scoring_signals"
  | "recomputing"
  | "ready";

// ---------------------------------------------------------------------------
// Stage updater — writes to jobs table, Realtime subscription in UI picks it up
// ---------------------------------------------------------------------------

async function setStage(
  jobId: string,
  stage: Stage,
  extras: Record<string, unknown> = {}
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("jobs")
    .update({ stage, ...extras })
    .eq("id", jobId);
}

async function markFailed(jobId: string, error: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("jobs")
    .update({
      status: "failed",
      error,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// ---------------------------------------------------------------------------
// Child job helpers — creates a jobs row for each fan-out child
// ---------------------------------------------------------------------------

async function createChildJob(
  parentJobId: string,
  jobType: string,
  targetRecordId: string
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      parent_job_id: parentJobId,
      job_type: jobType,
      target_table: jobType === "scrape-posts" ? "surfaces" : "posts",
      target_record_id: targetRecordId,
      status: "running",
      stage: "queued",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create child job: ${error?.message}`);
  return data.id;
}

async function incrementCompletedChildren(parentJobId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.rpc("increment_completed_children", { job_id: parentJobId });
}

function getTaskOutput<T>(result: unknown, taskId: string): T {
  if (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as { ok: boolean }).ok === true &&
    "output" in result
  ) {
    return (result as { output: T }).output;
  }

  const message =
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as { error?: unknown }).error === "string"
      ? (result as { error: string }).error
      : `Task ${taskId} failed`;
  throw new Error(message);
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function enrichTopic(payload: EnrichTopicPayload): Promise<void> {
  const { jobId, topicId, slug, query } = payload;
  const supabase = createServiceClient();

  try {
    // ── Step 1: Find Instagram profiles ──────────────────────────────────────
    await setStage(jobId, "finding_creators");

    const { profiles } = getTaskOutput<FindProfilesResult>(await tasks.triggerAndWait("find-profiles", {
      query,
    }), "find-profiles");

    if (profiles.length === 0) {
      await markFailed(jobId, "No profiles found for query");
      return;
    }

    // ── Step 2: Classify profiles and create surfaces ────────────────────────
    await setStage(jobId, "creating_surfaces");

    const { surfaceIds } = getTaskOutput<ClassifyResult>(
      await tasks.triggerAndWait("classify-and-create-surfaces", {
      topicId,
      topicSlug: slug,
      query,
      profiles,
    }),
      "classify-and-create-surfaces",
    );

    if (surfaceIds.length === 0) {
      await markFailed(jobId, "No relevant surfaces found after classification");
      return;
    }

    // ── Step 3: Scrape posts (fan-out per surface) ───────────────────────────
    await setStage(jobId, "scraping_posts", { total_children: surfaceIds.length });

    // Get usernames for the surfaces we just created
    const { data: surfaces } = await supabase
      .from("surfaces")
      .select("id, username")
      .in("id", surfaceIds);

    const postIds: string[] = [];

    for (const surface of surfaces ?? []) {
      const scrapeJobId = await createChildJob(jobId, "scrape-posts", surface.id);
      if (!surface.username) {
        throw new Error(`Surface ${surface.id} is missing username`);
      }
      const { postIds: ids } = getTaskOutput<ScrapePostsResult>(await tasks.triggerAndWait("scrape-posts", {
        surfaceId: surface.id,
        username: surface.username,
        jobId: scrapeJobId,
      }), "scrape-posts");
      postIds.push(...ids);

      await incrementCompletedChildren(jobId);
    }

    if (postIds.length === 0) {
      await markFailed(jobId, "No posts scraped across any surface");
      return;
    }

    // ── Step 4: Analyze signals + generate summaries (fan-out per post) ──────
    await setStage(jobId, "scoring_signals", { total_children: postIds.length, completed_children: 0 });

    for (const postId of postIds) {
      const analyzeJobId = await createChildJob(jobId, "analyze-signals", postId);
      const summaryJobId = await createChildJob(jobId, "generate-summary", postId);

      const [analyzeResult, summaryResult] = await Promise.all([
        tasks.triggerAndWait("analyze-signals", { postId, jobId: analyzeJobId }),
        tasks.triggerAndWait("generate-summary", { postId, jobId: summaryJobId }),
      ]);
      getTaskOutput(analyzeResult, "analyze-signals");
      getTaskOutput(summaryResult, "generate-summary");

      await incrementCompletedChildren(jobId);
    }

    // ── Step 5: Recompute topic-level scores ─────────────────────────────────
    await setStage(jobId, "recomputing");

    getTaskOutput(await tasks.triggerAndWait("recompute-scores", { topicId, jobId }), "recompute-scores");

    // ── Step 6: Mark complete ─────────────────────────────────────────────────
    await setStage(jobId, "ready");

    await supabase
      .from("jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", jobId);

    await supabase
      .from("topics")
      .update({ status: "active", enriched_at: new Date().toISOString() })
      .eq("id", topicId);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(jobId, message);
    throw err; // re-throw so Trigger.dev can retry
  }
}

export const enrichTopicTask = task({
  id: "enrich-topic",
  run: async (payload: EnrichTopicPayload): Promise<void> => {
    await enrichTopic(payload);
  },
});
