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
  maxProfiles?: number;
};

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
      searchTerms: [payload.query],
      maxProfilesPerQuery: payload.maxProfiles ?? 50,
    });

    await apifyWaitForRunCompletion(run.runId);
    const items = await apifyGetDatasetItems(run.datasetId);
    const profiles = items
      .map((item) => {
        const record = item as Record<string, unknown>;
        const username = asString(record.username);
        if (!username) return null;
        const biography = asString(record.biography) ?? "";

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
