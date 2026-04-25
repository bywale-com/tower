import { task } from "@trigger.dev/sdk/v3";
import { asString, getSupabaseAdmin, openAiJson } from "./helpers";

type SurfaceRow = {
  id: string;
  keyword: string | null;
  full_name: string | null;
  biography: string | null;
};

export type ClassifyAndCreateSurfacesInput = {
  limit?: number;
};

export type ClassifyAndCreateSurfacesOutput = {
  scannedCount: number;
  relevantCount: number;
  irrelevantCount: number;
  createdSpaces: string[];
};

type Classification = {
  relevant: boolean;
  space: string | null;
  confidence: "high" | "medium" | "low";
};

function guardClassification(payload: Record<string, unknown>): Classification {
  const relevant = payload.relevant === true;
  const space = asString(payload.space);
  const confidence = asString(payload.confidence);
  const normalized =
    confidence === "high" || confidence === "medium" || confidence === "low" ? confidence : "low";
  return { relevant, space, confidence: normalized };
}

export const classifyAndCreateSurfacesTask = task({
  id: "classify-and-create-surfaces",
  run: async (payload: ClassifyAndCreateSurfacesInput): Promise<ClassifyAndCreateSurfacesOutput> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("surfaces")
      .select("id, keyword, full_name, biography")
      .is("space", null)
      .limit(payload.limit ?? 100);

    if (error) throw error;
    const surfaces = (data ?? []) as SurfaceRow[];
    let relevantCount = 0;
    let irrelevantCount = 0;
    const createdSpaces = new Set<string>();

    for (const surface of surfaces) {
      const result = await openAiJson(
        "You classify profile relevance for an immigration intelligence system. Return only strict JSON.",
        `Keyword: ${surface.keyword ?? ""}\nFull name: ${surface.full_name ?? ""}\nBiography: ${
          surface.biography ?? ""
        }\nRespond as {"relevant": boolean, "space": "slug-or-null", "confidence": "high|medium|low"}.`,
        guardClassification,
      );

      if (!result.relevant || !result.space) {
        irrelevantCount += 1;
        await supabase.from("surfaces").update({ status: "irrelevant" }).eq("id", surface.id);
        continue;
      }

      relevantCount += 1;
      createdSpaces.add(result.space);
      await supabase.from("spaces").upsert({
        slug: result.space,
        title: result.space
          .split("-")
          .map((w) => w[0]?.toUpperCase() + w.slice(1))
          .join(" "),
      });
      await supabase
        .from("surfaces")
        .update({ status: "active", space: result.space })
        .eq("id", surface.id);
    }

    return {
      scannedCount: surfaces.length,
      relevantCount,
      irrelevantCount,
      createdSpaces: [...createdSpaces],
    };
  },
});
