import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

function formatCount(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function urgencyGaugeLabel(score: number): string {
  if (score >= 70) return "Critical Alert";
  if (score >= 40) return "Volatility Alert";
  if (score >= 20) return "Moderate Signal";
  return "Low Activity";
}

function urgencyGaugeColor(score: number): string {
  if (score >= 70) return "text-error";
  if (score >= 40) return "text-yellow-500";
  if (score >= 20) return "text-primary";
  return "text-outline";
}

function formatPublishedAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const CHART_PATH =
  "M0 250 L50 240 L100 210 L150 220 L200 180 L250 160 L300 190 L350 140 L400 150 L450 100 L500 120 L550 80 L600 90 L650 60 L700 70 L750 40 L800 50 L850 30 L900 45 L950 20 L1000 35 L1050 15 L1100 25 L1150 5 L1200 10";

const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export default async function IntelligencePage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const supabase = createServiceClient();

  // Phase 1: resolve topic + space identifiers
  const [{ data: topic }, { data: space }] = await Promise.all([
    supabase.from("topics").select("*").eq("slug", slug).single(),
    supabase.from("spaces").select("id, title").eq("slug", slug).single(),
  ]);

  if (!topic) notFound();

  const topicId: string | null = topic?.id ?? null;
  const spaceId: string | null = space?.id ?? null;

  // Phase 2: all dependent queries in parallel
  const [
    { data: tags },
    { data: monthlyStats },
    { data: popularQueries },
    { data: risingQueries },
    { data: newsItems },
    { data: creators },
    { data: trendingPosts },
  ] = await Promise.all([
    topicId
      ? supabase.from("topic_tags").select("id, tag").eq("topic_id", topicId).limit(12)
      : Promise.resolve({ data: [] }),
    topicId
      ? supabase
          .from("monthly_stats")
          .select("year, month, answered_count, unanswered_count")
          .eq("topic_id", topicId)
          .order("year", { ascending: true })
          .order("month", { ascending: true })
          .limit(12)
      : Promise.resolve({ data: [] }),
    topicId
      ? supabase
          .from("popular_queries")
          .select("query_text, rate_per_hour")
          .eq("topic_id", topicId)
          .order("rate_per_hour", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
    topicId
      ? supabase
          .from("rising_queries")
          .select("query_text, growth_pct, is_breakout")
          .eq("topic_id", topicId)
          .order("growth_pct", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
    topicId
      ? supabase
          .from("news_items")
          .select("id, headline, source, published_at")
          .eq("topic_id", topicId)
          .order("published_at", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
    supabase
      .from("surfaces")
      .select("username, full_name, followers, incumbency_score, avatar_url, follower_growth_7d_pct")
      .eq("space", slug)
      .order("incumbency_score", { ascending: false })
      .limit(3),
    spaceId
      ? supabase
          .from("posts")
          .select(
            "id, title, caption, thumbnail_url, urgency_score, platform, comments_count, like_count"
          )
          .eq("space_id", spaceId)
          .order("urgency_score", { ascending: false, nullsFirst: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
  ]);

  const urgencyScore: number = topic?.volatility_score ?? 0;
  const circumference = 2 * Math.PI * 40;
  const urgencyOffset = circumference - (circumference * urgencyScore) / 100;

  const demandSignals: string = topic?.demand_signals
    ? Number(topic.demand_signals).toLocaleString()
    : "—";

  const stats = [
    {
      label: "Total Questions",
      value: topic?.total_questions != null ? Number(topic.total_questions).toLocaleString() : "—",
      color: "text-primary",
    },
    {
      label: "Unanswered",
      value: topic?.unanswered != null ? Number(topic.unanswered).toLocaleString() : "—",
      color: "text-error",
    },
    {
      label: "Avg Response",
      value: topic?.avg_response_hours != null ? `${topic.avg_response_hours}h` : "—",
      color: "text-on-surface",
    },
    {
      label: "Top Platform",
      value: topic?.top_platform ?? "—",
      color: "text-on-surface",
    },
  ];

  const barChartRows = monthlyStats && monthlyStats.length > 0 ? monthlyStats : null;
  const barMax = barChartRows
    ? Math.max(...barChartRows.map((r: { answered_count: number; unanswered_count: number }) => r.answered_count + r.unanswered_count), 1)
    : 1;

  const currentMonth = new Date().getMonth() + 1;

  const topQueriesMax = popularQueries && popularQueries.length > 0
    ? Math.max(...popularQueries.map((q: { rate_per_hour: number }) => q.rate_per_hour ?? 0), 1)
    : 1;

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto">
      {/* ── BREADCRUMB / BACK NAV ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant -mb-4">
        <Link
          href="/app/discover"
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Discover
        </Link>
        <span className="text-outline">/</span>
        <span className="text-on-surface truncate max-w-[200px]">{topic?.title ?? slug}</span>
      </div>

      {/* ── TOPIC HEADER ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-5xl font-black font-headline text-on-surface tracking-tight mb-2">
                {topic?.title ?? slug}
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-primary font-mono text-lg font-medium">
                  {demandSignals} demand signals
                </span>
                <span className="w-1 h-1 rounded-full bg-outline" />
                <span className="text-on-surface-variant text-sm">
                  {topic?.last_updated
                    ? `Updated ${new Date(topic.last_updated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                    : "Live"}
                </span>
              </div>
            </div>
            <button className="px-6 py-2 border border-outline hover:bg-white/5 text-xs font-mono tracking-widest uppercase transition-all rounded-sm flex items-center gap-2 mt-2">
              <span className="material-symbols-outlined text-sm">notifications</span> Set Alert
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-8">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-surface-container-low p-4 rounded-xl relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 w-1 h-full bg-primary/40" />
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-label mb-1">
                  {s.label}
                </p>
                <p className={`text-2xl font-mono font-medium ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Urgency gauge */}
          <div
            className="bg-surface-container-low p-6 rounded-xl flex items-center justify-between shadow-lg"
            style={{ border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  className="text-surface-container-highest"
                  cx="48"
                  cy="48"
                  fill="transparent"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                />
                <circle
                  className={urgencyGaugeColor(urgencyScore)}
                  cx="48"
                  cy="48"
                  fill="transparent"
                  r="40"
                  stroke="currentColor"
                  strokeDasharray={circumference}
                  strokeDashoffset={urgencyOffset}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-mono font-bold">{urgencyScore}</span>
                <span className="text-[8px] font-mono uppercase tracking-tighter">/ 100</span>
              </div>
            </div>
            <div className="flex-1 ml-6">
              <h4 className="text-sm font-headline font-bold text-on-surface mb-1">
                {urgencyGaugeLabel(urgencyScore)}
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {topic?.urgency_summary ?? "Monitoring demand signals across this topic."}
              </p>
            </div>
          </div>

          {/* News ticker */}
          {newsItems && newsItems.length > 0 ? (
            <div className="bg-surface-container-highest/40 backdrop-blur-sm p-4 rounded-xl space-y-3">
              {newsItems.map((n: { id: string; headline: string; source: string | null; published_at: string | null }) => (
                <div key={n.id} className="flex items-center gap-3 overflow-hidden">
                  <span className="flex-shrink-0 text-[10px] font-mono text-primary px-1.5 bg-primary/20 border border-primary/20 rounded-sm">
                    {formatPublishedAt(n.published_at)}
                  </span>
                  <p className="text-[11px] truncate text-on-surface/80">{n.headline}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-highest/40 backdrop-blur-sm p-4 rounded-xl space-y-3">
              <p className="text-[11px] text-outline font-mono text-center py-2">
                No news items yet
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION A: POSTS / INTENT / CREATORS ─────────────────────────── */}
      <section className="grid grid-cols-12 gap-6">
        {/* Trending posts */}
        <div className="col-span-12 md:col-span-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-headline font-bold uppercase tracking-tight flex items-center gap-2">
              <span className="w-1 h-4 bg-primary inline-block" /> Trending Posts
            </h3>
            <Link href={`/app/feed?space=${slug}`}>
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-on-surface transition-colors">
                open_in_new
              </span>
            </Link>
          </div>

          {trendingPosts && trendingPosts.length > 0 ? (
            <>
              <Link href={`/app/posts/${trendingPosts[0].id}`}>
                <div
                  className="group relative aspect-video rounded-xl overflow-hidden bg-surface-container-low"
                  style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {trendingPosts[0].thumbnail_url ? (
                    <img
                      src={trendingPosts[0].thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-surface-container to-surface-container-highest" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="bg-primary text-on-primary text-[10px] font-mono px-2 py-0.5 rounded-sm mb-2 inline-block uppercase">
                      {trendingPosts[0].platform ?? "Post"} / Viral
                    </span>
                    <h4 className="text-sm font-headline font-bold leading-tight line-clamp-2">
                      {trendingPosts[0].title ?? trendingPosts[0].caption?.slice(0, 80) ?? "Untitled"}
                    </h4>
                  </div>
                </div>
              </Link>
              <div className="space-y-3">
                {trendingPosts.slice(1).map(
                  (p: {
                    id: string;
                    title: string | null;
                    caption: string | null;
                    thumbnail_url: string | null;
                    comments_count: number | null;
                    like_count: number | null;
                  }) => (
                    <Link key={p.id} href={`/app/posts/${p.id}`}>
                      <div className="flex gap-4 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors group cursor-pointer">
                        {p.thumbnail_url ? (
                          <img
                            src={p.thumbnail_url}
                            alt=""
                            className="w-16 h-16 rounded object-cover bg-surface-container-highest flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded bg-surface-container-highest flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-bold leading-snug line-clamp-2 mb-1">
                            {p.title ?? p.caption?.slice(0, 80) ?? "Untitled"}
                          </p>
                          <span className="text-[10px] font-mono text-on-surface-variant uppercase">
                            {formatCount(p.comments_count)} Comments •{" "}
                            {formatCount(p.like_count)} Likes
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="aspect-video rounded-xl bg-surface-container-low flex items-center justify-center">
              <p className="text-outline text-xs font-mono">No trending posts yet</p>
            </div>
          )}
        </div>

        {/* Popular intent */}
        <div className="col-span-12 md:col-span-4 bg-surface-container-low rounded-xl p-6">
          <h3 className="text-lg font-headline font-bold uppercase tracking-tight mb-6 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary inline-block" /> Popular Intent
          </h3>
          {popularQueries && popularQueries.length > 0 ? (
            <div className="space-y-5">
              {popularQueries.map(
                (item: { query_text: string; rate_per_hour: number | null }, i: number) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between group ${i > 0 ? "border-t border-white/5 pt-4" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-lg">search</span>
                      </div>
                      <span className="text-sm font-mono text-on-surface group-hover:text-primary transition-colors">
                        &ldquo;{item.query_text}&rdquo;
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      {item.rate_per_hour != null ? `${item.rate_per_hour.toFixed(0)} Q/HR` : "—"}
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-outline">
              <span className="material-symbols-outlined text-3xl mb-2">pending</span>
              <p className="text-xs font-mono">Populating...</p>
            </div>
          )}
        </div>

        {/* Intelligence nodes / creators */}
        <div className="col-span-12 md:col-span-4 bg-surface-container-low rounded-xl p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-headline font-bold uppercase tracking-tight flex items-center gap-2">
              <span className="w-1 h-4 bg-primary inline-block" /> Intelligence Nodes
            </h3>
          </div>
          <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {["Active", "Gainers", "Losers"].map((tab, i) => (
              <button
                key={tab}
                className={`flex-1 pb-3 text-[10px] font-mono uppercase tracking-widest ${
                  i === 0
                    ? "text-primary border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="space-y-6 mt-6">
            {creators && creators.length > 0 ? (
              creators.map(
                (c: {
                  username: string | null;
                  full_name: string | null;
                  followers: number | null;
                  incumbency_score: number | null;
                  avatar_url: string | null;
                  follower_growth_7d_pct: number | null;
                }) => {
                  const name = c.full_name ?? c.username ?? "Unknown";
                  const growth = c.follower_growth_7d_pct;
                  const growthStr =
                    growth != null ? `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%` : "—";
                  const growthColor =
                    growth == null ? "text-outline" : growth >= 0 ? "text-emerald-400" : "text-error";
                  return (
                    <Link
                      key={c.username}
                      href={c.username ? `/app/creators/${c.username}` : "#"}
                    >
                      <div className="flex items-center justify-between hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-3">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt={name} className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-xs font-bold text-primary">
                              {name[0]}
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold">{name}</h4>
                            <p className="text-[10px] font-mono text-on-surface-variant">@{c.username ?? "—"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold">{formatCount(c.followers)}</p>
                          <p className={`text-[10px] font-mono ${growthColor}`}>{growthStr}</p>
                        </div>
                      </div>
                    </Link>
                  );
                }
              )
            ) : (
              <p className="text-xs text-outline font-mono text-center py-4">No creators indexed yet</p>
            )}
          </div>
        </div>
      </section>

      {/* ── SECTION B: INTEREST OVER TIME CHART ──────────────────────────── */}
      <section>
        <div
          className="bg-surface-container-low rounded-xl p-8"
          style={{ border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-headline font-bold">Interest Over Time</h3>
              <p className="text-sm text-on-surface-variant">
                Demand velocity over the last 24 hours (Hourly intervals)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
                  Query Pulse
                </span>
              </div>
              <select className="bg-surface-container text-[10px] font-mono border-none rounded focus:ring-0 text-on-surface-variant">
                <option>LAST 24 HOURS</option>
                <option>LAST 7 DAYS</option>
              </select>
            </div>
          </div>
          <div className="h-[300px] w-full relative">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#b4c5ff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#b4c5ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${CHART_PATH} V300 H0 Z`} fill="url(#chartGradient)" />
              <path
                d={CHART_PATH}
                fill="none"
                stroke="#b4c5ff"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            </svg>
            <div className="absolute bottom-[-24px] left-0 w-full flex justify-between text-[10px] font-mono text-on-surface-variant opacity-60">
              {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION C: TOP / RISING QUERIES ──────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          className="bg-surface-container-low rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <h3 className="text-sm font-headline font-bold uppercase tracking-widest">
              Global Top Queries
            </h3>
            <span className="text-[10px] font-mono text-on-surface-variant uppercase">
              Sorted by total volume
            </span>
          </div>
          {popularQueries && popularQueries.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-surface-container-high text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
                <tr>
                  <th className="px-6 py-3 font-normal">Rank</th>
                  <th className="px-6 py-3 font-normal">Query</th>
                  <th className="px-6 py-3 font-normal">Interest Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {popularQueries.map(
                  (q: { query_text: string; rate_per_hour: number | null }, i: number) => (
                    <tr key={i} className="hover:bg-surface-container-high transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">{i + 1}</td>
                      <td className="px-6 py-4 text-xs font-medium">{q.query_text}</td>
                      <td className="px-6 py-4">
                        <div className="w-full h-1 bg-white/5 rounded-full">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${((q.rate_per_hour ?? 0) / topQueriesMax) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-xs text-outline font-mono">No query data yet</p>
            </div>
          )}
        </div>

        <div
          className="bg-surface-container-low rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <h3 className="text-sm font-headline font-bold uppercase tracking-widest text-primary">
              Rising Queries
            </h3>
            <span className="text-[10px] font-mono text-primary uppercase">Trending Now</span>
          </div>
          {risingQueries && risingQueries.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-surface-container-high text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
                <tr>
                  <th className="px-6 py-3 font-normal">Rank</th>
                  <th className="px-6 py-3 font-normal">Query</th>
                  <th className="px-6 py-3 font-normal">Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {risingQueries.map(
                  (q: { query_text: string; growth_pct: number | null; is_breakout: boolean | null }, i: number) => (
                    <tr key={i} className="hover:bg-surface-container-high transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">{i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{q.query_text}</span>
                          {q.is_breakout && (
                            <span className="bg-primary/20 text-primary text-[8px] font-bold px-1 rounded-sm">
                              BREAKOUT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-emerald-400">
                        {q.growth_pct != null ? `+${q.growth_pct.toLocaleString()}%` : "—"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-xs text-outline font-mono">No rising queries yet</p>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION D: ANSWER EFFICIENCY BAR CHART ───────────────────────── */}
      {barChartRows && barChartRows.length > 0 && (
        <section>
          <div
            className="bg-surface-container-low rounded-xl p-8"
            style={{ border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-headline font-bold">Answer Efficiency Distribution</h3>
                <p className="text-sm text-on-surface-variant">Monthly breakdown of signal fulfillment</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-primary-container" />
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-surface-container-highest" />
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant">Unanswered</span>
                </div>
              </div>
            </div>
            <div
              className="flex items-end justify-between h-[250px] gap-4 px-4 pb-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              {barChartRows.map(
                (m: { month: number; year: number; answered_count: number; unanswered_count: number }) => {
                  const ansPct = (m.answered_count / barMax) * 100;
                  const unansPct = (m.unanswered_count / barMax) * 100;
                  const isCurrent = m.month === currentMonth;
                  return (
                    <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full flex justify-center gap-1 items-end h-full">
                        <div className="w-1/3 bg-primary-container rounded-t-sm" style={{ height: `${ansPct}%` }} />
                        <div className="w-1/3 bg-surface-container-highest rounded-t-sm" style={{ height: `${unansPct}%` }} />
                      </div>
                      <span className={`text-[10px] font-mono mt-2 opacity-50 ${isCurrent ? "text-primary font-bold opacity-100" : ""}`}>
                        {MONTH_LABELS[(m.month - 1) % 12]}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION E: TAXONOMY CLUSTERS ─────────────────────────────────── */}
      {tags && tags.length > 0 && (
        <section>
          <h3 className="text-sm font-headline font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary inline-block" /> Taxonomy Clusters
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tags.map((t: { id: string; tag: string }) => (
              <div
                key={t.id}
                className="bg-surface-container-low hover:bg-primary/20 p-4 rounded-lg cursor-pointer transition-all group"
                style={{ border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <p className="text-xs font-medium group-hover:text-primary">{t.tag}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FLOATING CTA ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-8 right-8 z-50">
        <Link href={`/app/feed?space=${slug}`}>
          <button className="bg-primary-container hover:opacity-90 text-on-primary-container px-6 py-4 rounded-full flex items-center gap-3 shadow-[0_10px_30px_rgba(26,82,199,0.4)] transition-all hover:scale-105 active:scale-95 group">
            <span className="material-symbols-outlined font-bold group-hover:rotate-12 transition-transform">
              task_alt
            </span>
            <span className="font-headline font-bold text-sm tracking-tight">Claim a Question</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
