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
  space_slug: string | null;
};

function guardClassification(payload: Record<string, unknown>): Classification {
  const confidenceRaw = payload.confidence;
  const confidence =
    typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw) ? confidenceRaw : 0;
  const spaceSlug =
    typeof payload.space_slug === "string" && payload.space_slug.trim().length > 0
      ? payload.space_slug.trim()
      : null;
  return { is_relevant: payload.is_relevant === true, confidence, space_slug: spaceSlug };
}

export const classifyAndCreateSurfacesTask = task({
  id: "classify-and-create-surfaces",
  run: async (payload: ClassifyPayload): Promise<ClassifyResult> => {
    const supabase = getSupabaseAdmin();
    const relevantProfiles: Array<{ profile: Profile; spaceSlug: string | null }> = [];

    for (const profile of payload.profiles) {
      const result = await openAiJson(
        "Classify profile relevance to the topic. Return strict JSON only.",
        `Topic slug: ${payload.topicSlug}
Query: ${payload.query}
Username: ${profile.username}
Full name: ${profile.fullName}
Biography: ${profile.biography}
Return {"is_relevant": boolean, "confidence": number, "space_slug": string|null}.`,
        guardClassification,
      );
      if (result.is_relevant) {
        relevantProfiles.push({ profile, spaceSlug: result.space_slug });
      }
    }

    if (relevantProfiles.length === 0) return { surfaceIds: [] };

    const spaceIdBySlug = new Map<string, string>();
    const uniqueSpaceSlugs = [...new Set(relevantProfiles.map((item) => item.spaceSlug).filter(Boolean))];
    for (const slug of uniqueSpaceSlugs) {
      const { data: spaceRow, error: spaceError } = await supabase
        .from("spaces")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (spaceError) throw spaceError;
      if (spaceRow?.id) {
        spaceIdBySlug.set(slug, spaceRow.id as string);
      }
    }

    const upsertRows = relevantProfiles.map(({ profile, spaceSlug }) => ({
      username: profile.username,
      full_name: profile.fullName,
      biography: profile.biography,
      followers: profile.followersCount,
      avatar_url: profile.profilePicUrl ?? null,
      space_id: spaceSlug ? spaceIdBySlug.get(spaceSlug) ?? null : null,
      status: "pending",
    }));

    const { data, error } = await supabase
      .from("surfaces")
      .upsert(upsertRows, {
        onConflict: "username",
      })
      .select("id");

    if (error) throw error;
    return { surfaceIds: (data ?? []).map((row) => (row as { id: string }).id) };
  },
});
