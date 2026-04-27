import { task } from "@trigger.dev/sdk/v3";
import {
  apifyGetDatasetItems,
  apifyRunActor,
  apifyWaitForRunCompletion,
  asNumber,
  asString,
} from "./helpers";

export type FindProfilesPayload = {
  query: string;
  /** Pass-through for contacts-api~instagram-profile-finder; default United States. */
  country?: string;
  maxProfiles?: number;
};

/** At least one keyword required by Apify; split comma/semicolon/newline or use whole query. */
function keywordsFromQuery(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("find-profiles: query is empty; keywords cannot be built");
  }
  const parts = trimmed
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > 0) return parts;
  return [trimmed];
}

export type FindProfilesResult = {
  profiles: Array<{
    username: string;
    fullName: string;
    biography: string;
    followersCount: number;
    profilePicUrl?: string;
  }>;
};

export const findProfilesTask = task({
  id: "find-profiles",
  run: async (payload: FindProfilesPayload): Promise<FindProfilesResult> => {
    const run = await apifyRunActor("contacts-api~instagram-profile-finder", {
      keywords: keywordsFromQuery(payload.query),
      country: payload.country ?? "United States",
      max_leads: payload.maxProfiles ?? 50,
    });

    await apifyWaitForRunCompletion(run.runId);
    const items = await apifyGetDatasetItems(run.datasetId);
    const profiles = items
      .map((item) => {
        const record = item as Record<string, unknown>;
        const username = asString(record.username);
        if (!username) return null;

        const biography =
          asString(record.biography) ?? asString(record.bio) ?? "";
        const fullName = asString(record.fullName) ?? asString(record.full_name) ?? "";
        const followersCount =
          asNumber(record.followersCount) ?? asNumber(record.followers) ?? 0;
        const profilePicUrl =
          asString(record.profilePicUrl) ?? asString(record.profile_pic_url) ?? undefined;

        return {
          username,
          fullName,
          biography,
          followersCount,
          profilePicUrl,
        };
      })
      .filter((profile): profile is NonNullable<typeof profile> => profile !== null);

    return { profiles };
  },
});
