"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logSearch, logEnrichRequest } from "./actions";

type TrendingTopic = { id: string; label: string; velocity_score: number | null };
type Topic = { id: string; slug: string; title: string };

type Stage =
  | "queued"
  | "finding_creators"
  | "scraping_posts"
  | "scoring_signals"
  | "ready";

type EnrichState =
  | { phase: "idle" }
  | { phase: "confirming" }
  | { phase: "enriching"; jobId: string; slug: string; stage: Stage }
  | { phase: "ready"; slug: string };

const STAGE_LABELS: Record<Stage, string> = {
  queued: "Queued",
  finding_creators: "Finding creators",
  scraping_posts: "Scraping posts",
  scoring_signals: "Scoring signals",
  ready: "Ready",
};

const STAGE_ORDER: Stage[] = [
  "queued",
  "finding_creators",
  "scraping_posts",
  "scoring_signals",
  "ready",
];

const PERSISTED_JOB_KEY = "tower:enrich-job";

export default function DiscoverSearch({
  trendingTopics,
  topics,
}: {
  trendingTopics: TrendingTopic[];
  topics: Topic[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [enrichState, setEnrichState] = useState<EnrichState>({ phase: "idle" });
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Resume any persisted in-progress job on mount
  useEffect(() => {
    const stored = localStorage.getItem(PERSISTED_JOB_KEY);
    if (!stored) return;
    try {
      const { jobId, slug, stage } = JSON.parse(stored) as { jobId: string; slug: string; stage: Stage };
      if (stage === "ready") {
        localStorage.removeItem(PERSISTED_JOB_KEY);
        return;
      }
      setEnrichState({ phase: "enriching", jobId, slug, stage });
      subscribeToJob(jobId, slug);
    } catch {
      localStorage.removeItem(PERSISTED_JOB_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        createClient().removeChannel(channelRef.current);
      }
    };
  }, []);

  function subscribeToJob(jobId: string, slug: string) {
    const supabase = createClient();
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` },
        (payload) => {
          const updated = payload.new as { stage: Stage; status: string };
          const stage: Stage = (updated.stage as Stage) ?? "queued";

          localStorage.setItem(PERSISTED_JOB_KEY, JSON.stringify({ jobId, slug, stage }));

          if (stage === "ready" || updated.status === "completed") {
            setEnrichState({ phase: "ready", slug });
            localStorage.removeItem(PERSISTED_JOB_KEY);
            supabase.removeChannel(channel);
            channelRef.current = null;
            setTimeout(() => router.push(`/app/intelligence/${slug}`), 1200);
          } else {
            setEnrichState((prev) =>
              prev.phase === "enriching" ? { ...prev, stage } : prev
            );
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }

  const filtered =
    query.trim().length > 0
      ? topics.filter(
          (t) =>
            t.title.toLowerCase().includes(query.toLowerCase()) ||
            t.slug.includes(query.toLowerCase())
        )
      : topics;

  const hasNoMatch = query.trim().length > 0 && filtered.length === 0;
  const showDropdown =
    focused && enrichState.phase === "idle" && (filtered.length > 0 || hasNoMatch);

  function navigate(slug: string, label: string) {
    setFocused(false);
    startTransition(async () => {
      await logSearch(label);
      router.push(`/app/intelligence/${slug}`);
    });
  }

  function handleEnrich() {
    setEnrichError(null);
    setEnrichState({ phase: "confirming" });
  }

  async function confirmEnrich() {
    setEnrichState({ phase: "enriching", jobId: "", slug: "", stage: "queued" });
    await logEnrichRequest(query.trim());

    try {
      const res = await fetch("/api/topics/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json() as {
        exists?: boolean;
        topicSlug?: string;
        jobId?: string;
        error?: string;
      };

      if (!res.ok) {
        setEnrichState({ phase: "idle" });
        setEnrichError(data.error ?? "Failed to start enrichment.");
        return;
      }

      if (data.exists && data.topicSlug) {
        router.push(`/app/intelligence/${data.topicSlug}`);
        return;
      }

      if (data.jobId && data.topicSlug) {
        const { jobId, topicSlug: slug } = data as { jobId: string; topicSlug: string };
        localStorage.setItem(PERSISTED_JOB_KEY, JSON.stringify({ jobId, slug, stage: "queued" }));
        setEnrichState({ phase: "enriching", jobId, slug, stage: "queued" });
        subscribeToJob(jobId, slug);
      }
    } catch {
      setEnrichState({ phase: "idle" });
      setEnrichError("Network error. Please try again.");
    }
  }

  function cancelEnrich() {
    setEnrichState({ phase: "idle" });
    setEnrichError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    logSearch(query.trim());
    const match =
      topics.find((t) => t.title.toLowerCase() === trimmed || t.slug === trimmed) ??
      filtered[0];
    if (match) {
      navigate(match.slug, query.trim());
    } else if (enrichState.phase === "idle") {
      handleEnrich();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  }

  const stageIndex =
    enrichState.phase === "enriching"
      ? STAGE_ORDER.indexOf(enrichState.stage)
      : enrichState.phase === "ready"
        ? STAGE_ORDER.length - 1
        : -1;

  return (
    <div className="relative flex flex-col items-center justify-center -mx-8 -mt-8 min-h-[calc(100vh-56px)]">
      {/* Ambient glow blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full pointer-events-none bg-primary-container/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none bg-[rgba(13,21,70,0.1)] blur-[100px]" />

      {/* Search container */}
      <div className="w-full max-w-[640px] flex flex-col items-center z-10 px-4">
        {/* Logo mark */}
        <div className="flex flex-col gap-1 mb-10 items-center">
          <div className="w-12 h-5 bg-primary-container" />
          <div className="w-12 h-5 bg-primary-container" />
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="w-full relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">search</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (enrichState.phase === "confirming") setEnrichState({ phase: "idle" });
              setEnrichError(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Search a market, topic, or industry..."
            className="w-full h-[52px] bg-surface-container-low border-none rounded-lg pl-14 pr-14 text-on-background placeholder:text-outline text-base focus:outline-none focus:ring-1 focus:ring-primary/40 shadow-xl shadow-black/20 transition-all"
          />
        </form>

        {enrichError && (
          <p className="mt-2 text-[11px] font-mono text-error bg-error/10 border border-error/30 px-3 py-2 rounded-sm w-full">
            {enrichError}
          </p>
        )}

        {/* ── STANDARD AUTOCOMPLETE DROPDOWN ── */}
        {showDropdown && (
          <div className="w-full mt-2 bg-surface-container-low rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-outline-variant/10">
            {filtered.length > 0 ? (
              <>
                <div className="flex flex-col">
                  {filtered.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onMouseDown={() => navigate(t.slug, t.title)}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-highest cursor-pointer transition-colors group text-left w-full"
                    >
                      <span className="material-symbols-outlined text-outline text-lg group-hover:text-primary transition-colors">
                        search
                      </span>
                      <span className="text-on-surface-variant font-medium">{t.title}</span>
                      <span className="ml-auto text-[10px] uppercase tracking-widest text-outline-variant font-mono">
                        Topic
                      </span>
                    </button>
                  ))}
                </div>
                <div className="px-5 py-3 flex justify-between items-center bg-surface-container/40 border-t border-outline-variant/10">
                  <div className="flex gap-4">
                    <span className="text-[10px] font-mono text-outline uppercase tracking-tighter flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-highest border border-outline-variant/30 text-on-surface">
                        ↑↓
                      </span>{" "}
                      Navigate
                    </span>
                    <span className="text-[10px] font-mono text-outline uppercase tracking-tighter flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-highest border border-outline-variant/30 text-on-surface">
                        Enter
                      </span>{" "}
                      Select
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-widest">
                    Power Search Enabled
                  </span>
                </div>
              </>
            ) : (
              /* No match → inline enrich prompt */
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant">
                    No data yet for{" "}
                    <span className="text-on-surface font-semibold">&ldquo;{query.trim()}&rdquo;</span>.
                  </p>
                  <p className="text-[10px] font-mono text-outline mt-0.5">
                    Enrich this topic to start tracking it.
                  </p>
                </div>
                <button
                  onMouseDown={handleEnrich}
                  className="shrink-0 px-4 py-2 bg-primary text-on-primary text-[10px] font-mono uppercase tracking-widest rounded-sm hover:opacity-90 transition-all active:scale-95"
                >
                  Enrich topic
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRM ENRICH PANEL ── */}
        {enrichState.phase === "confirming" && (
          <div className="w-full mt-2 bg-surface-container-low rounded-xl border border-primary/20 shadow-2xl shadow-black/40 px-6 py-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-2xl mt-0.5">
                auto_awesome
              </span>
              <div>
                <p className="text-sm font-headline font-bold text-on-surface">
                  Enrich &ldquo;{query.trim()}&rdquo;?
                </p>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Tower will find creators, scrape posts, and score demand signals for this topic. Usually takes 2–5 minutes.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmEnrich}
                className="flex-1 py-2.5 bg-primary text-on-primary text-xs font-mono uppercase tracking-widest rounded-sm hover:opacity-90 transition-all active:scale-[0.98]"
              >
                Start enrichment
              </button>
              <button
                onClick={cancelEnrich}
                className="px-4 py-2.5 border border-outline-variant/50 text-on-surface-variant text-xs font-mono uppercase tracking-widest rounded-sm hover:bg-surface-container-highest transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── ENRICHMENT PROGRESS PANEL ── */}
        {(enrichState.phase === "enriching" || enrichState.phase === "ready") && (
          <div className="w-full mt-2 bg-surface-container-low rounded-xl border border-primary/20 shadow-2xl shadow-black/40 px-6 py-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-headline font-bold text-on-surface">
                  {enrichState.phase === "ready"
                    ? "Topic ready"
                    : `Building: ${query.trim() || (enrichState.phase === "enriching" ? enrichState.slug : "")}`}
                </p>
                <p className="text-[10px] font-mono text-primary uppercase tracking-widest mt-0.5">
                  {enrichState.phase === "ready" ? "Navigating..." : "Live enrichment in progress"}
                </p>
              </div>
              {enrichState.phase === "enriching" && (
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              )}
              {enrichState.phase === "ready" && (
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              )}
            </div>

            {/* Stage pipeline */}
            <div className="space-y-3">
              {STAGE_ORDER.map((stage, i) => {
                const isDone = i < stageIndex;
                const isActive = i === stageIndex;
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isDone
                          ? "bg-primary"
                          : isActive
                            ? "border-2 border-primary"
                            : "border border-outline-variant/30"
                      }`}
                    >
                      {isDone ? (
                        <span className="material-symbols-outlined text-on-primary text-[12px]">
                          check
                        </span>
                      ) : isActive ? (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      ) : null}
                    </div>
                    <span
                      className={`text-xs font-mono ${
                        isDone
                          ? "text-on-surface-variant line-through"
                          : isActive
                            ? "text-on-surface font-semibold"
                            : "text-outline"
                      }`}
                    >
                      {STAGE_LABELS[stage]}
                    </span>
                    {isActive && (
                      <span className="ml-auto text-[9px] font-mono text-primary uppercase tracking-widest animate-pulse">
                        Running
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {enrichState.phase === "enriching" && (
              <button
                onClick={() => {
                  setEnrichState({ phase: "idle" });
                  setQuery("");
                }}
                className="text-[10px] font-mono text-outline hover:text-on-surface transition-colors uppercase tracking-widest"
              >
                ← Search something else (job continues in background)
              </button>
            )}
          </div>
        )}

        {/* ── TRENDING / FALLBACK CHIPS ── */}
        {enrichState.phase === "idle" && (
          <>
            {trendingTopics.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-[500px]">
                {trendingTopics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(t.label.toLowerCase().replace(/\s+/g, "-"), t.label)}
                    className="px-3 py-1.5 bg-surface-container-low text-xs text-outline rounded-full cursor-pointer border border-outline-variant/10 transition-all hover:border-primary/40 hover:text-on-surface"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {trendingTopics.length === 0 && topics.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-[500px]">
                {topics.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(t.slug, t.title)}
                    className="px-3 py-1.5 bg-surface-container-low text-xs text-outline rounded-full cursor-pointer border border-outline-variant/10 transition-all hover:border-primary/40 hover:text-on-surface"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
