import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type {
  Post,
  Surface,
  Signal,
  Transcript,
} from "@/lib/supabase/types";
import SignalsPanel from "./SignalsPanel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a duration in seconds → "96s" or "2m 14s" */
function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/** Compact number → "6,968" / "42.5K" */
function formatCount(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** Urgency score → Tailwind ring color class (SVG stroke) */
function urgencyRingColor(score: number | null): string {
  if (score === null) return "text-outline";
  if (score >= 70) return "text-error";
  if (score >= 40) return "text-[#fb923c]";
  if (score >= 20) return "text-yellow-500";
  return "text-primary";
}

/** Urgency score → human label */
function urgencyLabel(score: number | null): string {
  if (score === null) return "Unknown";
  if (score >= 70) return "Critical Urgency";
  if (score >= 40) return "High Urgency";
  if (score >= 20) return "Med Urgency";
  return "Low Urgency";
}

/** Relative time → "2m ago" / "15h ago" */
function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PostPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Parallel fetch: post, surface, signals, transcript
  const [postResult, surfaceResult, signalsResult, transcriptResult] = await Promise.all([
    supabase
      .from("posts")
      .select(
        `id, title, caption, hashtags, content_type, thumbnail_url,
         video_url, url, like_count, comments_count, view_count,
         duration_seconds, posted_at, last_comment_at, urgency_score,
         analyzed_signal_count, high_urgency_signal_count,
         engagement_rate, ai_summary, surface_id, surface_username`
      )
      .eq("id", params.id)
      .single(),
    supabase
      .from("surfaces")
      .select(
        `username, full_name, followers, is_verified, avatar_url, incumbency_score,
         posts!inner(id)`
      )
      .eq("posts.id", params.id)
      .maybeSingle(),

    supabase
      .from("signals")
      .select(
        "id, text, urgency_score, intent_label, is_answered, status, claimed_by, commented_at, commenter_username"
      )
      .eq("post_id", params.id)
      .order("urgency_score", { ascending: false })
      .limit(10),

    supabase
      .from("transcripts")
      .select("segments")
      .eq("post_id", params.id)
      .maybeSingle(),
  ]);

  // 404 if post not found
  if (postResult.error || !postResult.data) {
    notFound();
  }

  const post = postResult.data as Post;
  const surfaceData = surfaceResult.data as (Surface & { posts?: { id: string }[] }) | null;
  const surface = surfaceData
    ? ({
        username: surfaceData.username,
        full_name: surfaceData.full_name,
        followers: surfaceData.followers,
        is_verified: surfaceData.is_verified,
        avatar_url: surfaceData.avatar_url,
        incumbency_score: surfaceData.incumbency_score,
      } as Surface)
    : null;
  const signals: Signal[] = signalsResult.data ?? [];
  const transcript: Transcript | null = transcriptResult.data ?? null;

  // Computed values
  const RING_C = 440; // circumference for r=70
  const urgencyOffset = RING_C - (RING_C * (post.urgency_score ?? 0)) / 100;
  const ringColor = urgencyRingColor(post.urgency_score);

  return (
    <div className="grid grid-cols-12 gap-8 max-w-[1400px] mx-auto">
      {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
      <section className="col-span-12 lg:col-span-7 space-y-8">
        {/* Video / thumbnail */}
        <div className="relative group rounded-xl overflow-hidden bg-surface-container-low shadow-2xl">
          {post.thumbnail_url ? (
            <Image
              src={post.thumbnail_url}
              alt={post.title ?? "Post thumbnail"}
              width={1280}
              height={720}
              className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-surface-container-low to-surface-container-highest opacity-80" />
          )}
          {/* Play button */}
          {post.video_url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-16 h-16 bg-primary/90 text-on-primary rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </button>
            </div>
          )}
          {/* Content type badge */}
          {post.content_type && (
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-bold tracking-widest rounded-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">movie</span>
                {post.content_type.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Creator attribution row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {surface?.avatar_url ? (
              <Image
                src={surface.avatar_url}
                alt={surface.username}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover border border-primary/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                {(surface?.username ?? post.surface_username ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/app/creators/${surface?.username ?? post.surface_username}`}
                  className="font-headline font-bold text-on-surface hover:text-primary transition-colors"
                >
                  @{surface?.username ?? post.surface_username ?? "unknown"}
                </Link>
                {surface?.is_verified && (
                  <span
                    className="material-symbols-outlined text-sm text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                )}
              </div>
              {surface?.followers !== null && surface?.followers !== undefined && (
                <span className="text-[10px] font-mono text-outline uppercase tracking-wider">
                  {formatCount(surface.followers)} Followers
                </span>
              )}
            </div>
          </div>
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-outline hover:text-primary transition-colors font-mono text-xs"
            >
              <span className="material-symbols-outlined text-sm">link</span>
              View on platform
            </a>
          )}
        </div>

        {/* Caption + hashtags */}
        {(post.caption || (post.hashtags && post.hashtags.length > 0)) && (
          <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
            {post.caption && (
              <p className="text-on-surface leading-relaxed text-sm">
                {post.caption}
              </p>
            )}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-surface-container-highest text-primary font-mono text-[10px] rounded cursor-pointer hover:bg-primary hover:text-on-primary transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4-stat grid */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Views", value: formatCount(post.view_count) },
            { label: "Comments", value: formatCount(post.comments_count) },
            { label: "Likes", value: formatCount(post.like_count) },
            { label: "Duration", value: formatDuration(post.duration_seconds) },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-1 border-b border-primary/5"
            >
              <span className="text-outline text-[10px] font-mono uppercase tracking-widest">
                {s.label}
              </span>
              <span className="text-xl font-bold font-mono text-on-background">
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {/* Transcript + Tower's Read */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transcript */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-semibold text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">
                  segment
                </span>{" "}
                Transcript
              </h3>
              <span className="px-2 py-0.5 bg-surface-container-highest text-outline font-mono text-[9px] uppercase tracking-wider rounded">
                Auto-generated
              </span>
            </div>
            <div className="h-48 overflow-y-auto bg-surface-container-low p-4 rounded-xl border-l-2 border-primary/20 no-scrollbar">
              {transcript?.segments && transcript.segments.length > 0 ? (
                <div className="text-on-surface-variant text-xs leading-relaxed space-y-3">
                  {transcript.segments.map((seg, i) => (
                    <p key={i}>
                      <span className="text-outline font-mono">
                        [{seg.start_time}]
                      </span>{" "}
                      {seg.text}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-on-surface-variant text-xs italic">
                  Transcript not yet available for this post.
                </p>
              )}
            </div>
          </div>

          {/* Tower's Read */}
          <div className="space-y-4">
            <h3 className="font-headline font-semibold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">
                psychology
              </span>{" "}
              Tower&apos;s Read
            </h3>
            <div className="h-48 bg-primary/10 p-5 rounded-xl border border-primary/20 flex flex-col justify-center">
              {post.ai_summary ? (
                <p className="text-primary text-sm leading-relaxed italic">
                  &quot;{post.ai_summary}&quot;
                </p>
              ) : (
                <p className="text-outline text-xs italic">
                  Analysis pending — no AI summary generated yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
      <section className="col-span-12 lg:col-span-5 space-y-8">
        {/* Urgency gauge */}
        <div className="bg-surface-container-low p-8 rounded-xl relative overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="absolute top-0 right-0 p-3">
            <span className="material-symbols-outlined text-error/30 text-6xl">
              priority_high
            </span>
          </div>
          {/* SVG ring */}
          <div className="relative mb-4">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                className="text-surface-container-highest"
                cx="80"
                cy="80"
                fill="transparent"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
              />
              <circle
                className={ringColor}
                cx="80"
                cy="80"
                fill="transparent"
                r="70"
                stroke="currentColor"
                strokeDasharray={RING_C}
                strokeDashoffset={urgencyOffset}
                strokeWidth="12"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold font-mono text-on-surface">
                {post.urgency_score ?? "—"}
              </span>
              <span className="text-[10px] font-mono text-outline uppercase tracking-widest">
                / 100
              </span>
            </div>
          </div>
          <h2 className="text-lg font-headline font-bold text-on-surface">
            {urgencyLabel(post.urgency_score)}
          </h2>
          <p className="text-xs font-mono text-outline mt-1 uppercase tracking-widest">
            Based on {post.analyzed_signal_count ?? 0} analyzed comments
          </p>

          {/* Creator score bar */}
          {surface?.incumbency_score !== null &&
            surface?.incumbency_score !== undefined && (
              <div
                className="mt-6 w-full pt-6 flex justify-between items-center px-4"
                style={{ borderTop: "1px solid rgba(180,197,255,0.1)" }}
              >
                <span className="text-xs font-headline text-on-surface-variant">
                  Creator Score
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${surface.incumbency_score}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm font-bold text-primary">
                    {surface.incumbency_score}
                  </span>
                </div>
              </div>
            )}
        </div>

        <SignalsPanel signals={signals} currentUserId={user?.id ?? null} />

        {/* Footer metadata */}
        <div className="space-y-2">
          {post.last_comment_at && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-outline uppercase tracking-widest">
              <span className="material-symbols-outlined text-xs">history</span>
              Last signal:{" "}
              <span className="text-on-surface ml-1">
                {relativeTime(post.last_comment_at)}
              </span>
            </div>
          )}
          {post.posted_at && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-outline uppercase tracking-widest">
              <span className="material-symbols-outlined text-xs">
                calendar_today
              </span>
              Posted:{" "}
              <span className="text-on-surface ml-1">
                {new Date(post.posted_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
