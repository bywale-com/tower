import { task } from "@trigger.dev/sdk/v3";
import {
  apifyGetDatasetItems,
  apifyRunActor,
  asBoolean,
  asNumber,
  asString,
  getSupabaseAdmin,
} from "./helpers";

export type FindProfilesInput = {
  searchId: string;
  keyword: string;
  country?: string;
  maxLeads?: number;
};

export type FindProfilesOutput = {
  searchId: string;
  runId: string;
  datasetId: string;
  insertedCount: number;
};

export const findProfilesTask = task({
  id: "find-profiles",
  run: async (payload: FindProfilesInput): Promise<FindProfilesOutput> => {
    const supabase = getSupabaseAdmin();
    const run = await apifyRunActor("contacts-api~instagram-profile-finder", {
      keywords: [payload.keyword],
      country: payload.country ?? "Canada",
      max_leads: payload.maxLeads ?? 100,
    });

    const items = await apifyGetDatasetItems(run.datasetId);
    const rows = items
      .map((item) => {
        const record = item as Record<string, unknown>;
        const userId = asString(record.user_id) ?? asString(record.userId);
        const username = asString(record.username);
        if (!userId || !username) return null;
        return {
          keyword: payload.keyword,
          url: asString(record.url),
          username,
          full_name: asString(record.full_name),
          biography: asString(record.biography),
          user_id: userId,
          followers: asNumber(record.followers),
          following: asNumber(record.following),
          post_count: asNumber(record.post_count),
          is_verified: asBoolean(record.is_verified),
          is_business_account: asBoolean(record.is_business_account),
          is_professional_account: asBoolean(record.is_professional_account),
          external_url: asString(record.external_url),
          collected_at: new Date().toISOString(),
          platform: "instagram",
          scrape_job_url: run.runId,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (rows.length > 0) {
      const { error } = await supabase.from("surfaces").upsert(rows, {
        onConflict: "user_id",
      });
      if (error) throw error;
    }

    await supabase
      .from("searches")
      .update({ status: "profiles_found", last_run_at: new Date().toISOString() })
      .eq("id", payload.searchId);

    return {
      searchId: payload.searchId,
      runId: run.runId,
      datasetId: run.datasetId,
      insertedCount: rows.length,
    };
  },
});
