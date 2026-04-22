import { createServiceClient } from "@/lib/supabase/server";
import DiscoverSearch from "./DiscoverSearch";

export default async function DiscoverPage() {
  const supabase = createServiceClient();

  const [{ data: trendingTopics }, { data: topicsData }] = await Promise.all([
    supabase
      .from("trending_topics")
      .select("id, label, velocity_score")
      .order("velocity_score", { ascending: false })
      .limit(6),
    supabase
      .from("topics")
      .select("id, slug, title")
      .eq("status", "active")
      .limit(20),
  ]);

  return (
    <DiscoverSearch
      trendingTopics={trendingTopics ?? []}
      topics={topicsData ?? []}
    />
  );
}
