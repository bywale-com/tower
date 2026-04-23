import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import FeedPostsTable from "./FeedPostsTable";

type FeedPost = {
  id: string;
  title: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  urgency_score: number | null;
  analyzed_signal_count: number | null;
  surface_id: string | null;
  surface_username: string | null;
  platform: string | null;
};

type SurfaceRow = {
  id: string;
  username: string | null;
  space: string | null;
};

const detailPanel = {
  topic: "Canada Immigration",
  subtitle: "Global Intelligence Pulse",
  trend: "+18.4%",
  sparkPath: "M0 80 Q50 70 100 85 T200 40 T300 60 T400 20",
  breakdownChips: ["Work Permits", "Express Entry", "Provincial Nominees", "Student Visas"],
  news: [
    { headline: "IRCC announces new points system for 2024 Express Entry draws.", source: "REUTERS", time: "2h ago" },
    { headline: "Provincial nominee programs seeing 40% surge in tech applicants.", source: "BNN BLOOMBERG", time: "5h ago" },
    { headline: "Remote work policies impact on PR eligibility: A full report.", source: "GLOBE AND MAIL", time: "8h ago" },
  ],
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: { space?: string };
}) {
  const supabase = createServiceClient();
  const spaceSlug = searchParams.space;

  let spaceId: string | null = null;
  let spaceName: string | null = null;
  if (spaceSlug) {
    const { data: space } = await supabase
      .from("spaces")
      .select("id, title")
      .eq("slug", spaceSlug)
      .single();
    spaceId = space?.id ?? null;
    spaceName = space?.title ?? spaceSlug;
  }

  let postsQuery = supabase
    .from("posts")
    .select(
      "id, title, caption, thumbnail_url, platform, posted_at, urgency_score, analyzed_signal_count, surface_id, surface_username"
    )
    .gt("analyzed_signal_count", 0)
    .order("urgency_score", { ascending: false, nullsFirst: false })
    .limit(50);

  if (spaceId) {
    postsQuery = postsQuery.eq("space_id", spaceId);
  }

  const { data: postsData, error: postsError } = await postsQuery;

  const surfaceIds = Array.from(
    new Set(
      (postsData ?? [])
        .map((post) => post.surface_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: surfacesData, error: surfacesError } = surfaceIds.length
    ? await supabase
        .from("surfaces")
        .select("id, username, space")
        .in("id", surfaceIds)
    : { data: [], error: null };

  const surfacesById = new Map<string, SurfaceRow>(
    ((surfacesData ?? []) as SurfaceRow[]).map((surface) => [surface.id, surface])
  );

  const feedRows: FeedPost[] =
    postsData?.map((row) => {
      const surface = row.surface_id ? surfacesById.get(row.surface_id) : null;
      return {
        id: row.id,
        title: row.title,
        caption: row.caption,
        thumbnail_url: row.thumbnail_url,
        posted_at: row.posted_at,
        urgency_score: row.urgency_score,
        analyzed_signal_count: row.analyzed_signal_count,
        surface_id: row.surface_id,
        surface_username: row.surface_username ?? surface?.username ?? null,
        platform: row.platform ?? surface?.space ?? null,
      };
    }) ?? [];

  return (
    <div className="space-y-0 -mx-8 -mt-8">
      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-30 w-full h-14 px-8 flex justify-between items-center glass-nav border-b border-surface-variant/15">
        <div className="flex items-center gap-8">
          <div className="text-xl font-headline font-bold tracking-tighter text-primary">
            SOVEREIGN LENS
          </div>
          <nav className="hidden md:flex gap-6">
            {["Location", "Timeframe", "Platform"].map((tab, i) => (
              <button
                key={tab}
                className={`text-sm tracking-tight ${
                  i === 0
                    ? "text-primary border-b-2 border-primary-container pb-1"
                    : "text-on-surface-variant hover:text-on-background transition-colors"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
              search
            </span>
            <input
              className="bg-surface-container-highest border-none rounded-sm pl-10 pr-4 py-1.5 text-sm text-on-surface focus:ring-1 focus:ring-primary/50 w-64 outline-none"
              type="text"
              defaultValue={spaceName ?? "canada immigration"}
            />
          </div>
          <div className="flex gap-2">
            {["notifications", "settings"].map((icon) => (
              <button
                key={icon}
                className="p-2 text-primary hover:bg-surface-container-highest transition-all rounded-full active:scale-95"
              >
                <span className="material-symbols-outlined">{icon}</span>
              </button>
            ))}
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center text-xs font-bold text-primary">
            A
          </div>
        </div>
      </div>

      {/* ── SEARCH SUMMARY ── */}
      <div className="px-8 py-6">
        <p className="text-on-surface-variant text-sm">
          <span className="font-bold text-primary">{feedRows.length.toLocaleString()} posts</span>
          {spaceName ? (
            <> for <span className="text-on-surface">{spaceName}</span></>
          ) : (
            <> ranked by urgency</>
          )}
        </p>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="px-8 pb-12 flex gap-8">
        {/* Left: feed table */}
        <section className="w-2/3">
          <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-lg">
            <FeedPostsTable feedRows={feedRows} />
          </div>
        </section>

        {/* Right: detail panel */}
        <section className="w-1/3">
          <div
            className="sticky top-20 bg-surface-container-low rounded-xl p-6 shadow-2xl space-y-8 border-l border-outline-variant/10"
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-6 bg-primary" />
                  <h2 className="text-2xl font-headline font-bold text-on-surface">
                    {spaceName ?? detailPanel.topic}
                  </h2>
                </div>
                <p className="text-xs text-outline uppercase tracking-widest">
                  {detailPanel.subtitle}
                </p>
              </div>
              <button className="p-1 hover:bg-surface-container-highest rounded-sm transition-colors">
                <span className="material-symbols-outlined text-outline">close</span>
              </button>
            </div>

            {/* Sparkline */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-xs text-on-surface-variant">24H INTEREST TREND</p>
                <span className="text-primary font-mono text-sm">{detailPanel.trend}</span>
              </div>
              <div className="h-24 w-full bg-surface-container-lowest rounded-sm relative overflow-hidden">
                <svg
                  className="absolute inset-0 w-full h-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 400 100"
                >
                  <defs>
                    <linearGradient id="sparkGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#1a52c7" stopOpacity={1} />
                      <stop offset="100%" stopColor="#1a52c7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path d={detailPanel.sparkPath} fill="none" stroke="#1a52c7" strokeWidth="3" />
                  <path
                    d={`${detailPanel.sparkPath} V100 H0 Z`}
                    fill="url(#sparkGrad)"
                    opacity="0.2"
                  />
                </svg>
              </div>
            </div>

            {/* Breakdown chips */}
            <div className="space-y-4">
              <p className="text-xs text-on-surface-variant uppercase tracking-widest">
                Trend Breakdown
              </p>
              <div className="flex flex-wrap gap-2">
                {detailPanel.breakdownChips.map((chip) => (
                  <button
                    key={chip}
                    className="px-3 py-1.5 bg-surface-container-highest text-on-surface text-xs rounded-sm border border-outline-variant/30 hover:border-primary/50 transition-all active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-4">
              <Link
                href={spaceSlug ? `/app/intelligence?space=${spaceSlug}` : "/app/intelligence"}
                className="bg-primary-container text-on-primary-container py-3 rounded-sm font-bold text-xs uppercase tracking-widest text-center hover:opacity-90 transition-all active:scale-[0.98]"
              >
                Explore Topic
              </Link>
              <button
                className="py-3 rounded-sm font-bold text-xs uppercase tracking-widest border border-outline-variant/80 hover:bg-surface-container-highest active:scale-[0.98] transition-all text-on-surface"
              >
                Search It
              </button>
            </div>

            {/* In the news */}
            <div className="pt-8 border-t border-outline-variant/15">
              <h3 className="text-xs text-on-surface-variant uppercase tracking-widest mb-6">
                In the News
              </h3>
              <div className="space-y-6">
                {detailPanel.news.map((n) => (
                  <div key={n.headline} className="flex gap-4 group cursor-pointer">
                    <div className="w-16 h-16 shrink-0 rounded overflow-hidden bg-surface-container-highest" />
                    <div className="flex flex-col justify-between">
                      <h4 className="text-xs font-headline font-bold text-on-surface line-clamp-2 leading-tight">
                        {n.headline}
                      </h4>
                      <p className="text-[10px] text-primary font-semibold">
                        {n.source} • {n.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
