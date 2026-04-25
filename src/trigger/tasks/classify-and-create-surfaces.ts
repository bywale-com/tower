import { task } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin, openAiJson } from "./helpers";

type Profile = {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  profilePicUrl?: string;
};

export type ClassifyPayload = {
  topicId: string;
  topicSlug: string;
  query: string;
  profiles: Profile[];
};

export type ClassifyResult = {
  surfaceIds: string[];
};

type Classification = {
  is_relevant: boolean;
  confidence: number;
};

function guardClassification(payload: Record<string, unknown>): Classification {
  const confidenceRaw = payload.confidence;
  const confidence =
    typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw) ? confidenceRaw : 0;
  return { is_relevant: payload.is_relevant === true, confidence };
}

export const classifyAndCreateSurfacesTask = task({
  id: "classify-and-create-surfaces",
  run: async (payload: ClassifyPayload): Promise<ClassifyResult> => {
    const supabase = getSupabaseAdmin();
    const relevantProfiles: Profile[] = [];

    for (const profile of payload.profiles) {
      const result = await openAiJson(
        "Classify profile relevance to the topic. Return strict JSON only.",
        `Topic slug: ${payload.topicSlug}\nQuery: ${payload.query}\nUsername: ${profile.username}\nFull name: ${profile.fullName}\nBiography: ${profile.biography}\nReturn {"is_relevant": boolean, "confidence": number}.`,
        guardClassification,
      );
      if (result.is_relevant) relevantProfiles.push(profile);
    }

    if (relevantProfiles.length === 0) return { surfaceIds: [] };

    const upsertRows = relevantProfiles.map((profile) => ({
      topic_id: payload.topicId,
      username: profile.username,
      full_name: profile.fullName,
      bio: profile.biography,
      follower_count: profile.followersCount,
      profile_pic_url: profile.profilePicUrl ?? null,
      status: "pending",
    }));

    const { data, error } = await supabase
      .from("surfaces")
      .upsert(upsertRows, {
        onConflict: "topic_id,username",
      })
      .select("id");

    if (error) throw error;
    return { surfaceIds: (data ?? []).map((row) => (row as { id: string }).id) };
  },
});
