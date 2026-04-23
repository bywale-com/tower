"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { logSearch } from "./actions";

type TrendingTopic = { id: string; label: string; velocity_score: number | null };
type Topic = { id: string; slug: string; title: string };

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
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered =
    query.trim().length > 0
      ? topics.filter(
          (t) =>
            t.title.toLowerCase().includes(query.toLowerCase()) ||
            t.slug.includes(query.toLowerCase())
        )
      : topics;

  const showDropdown = focused && filtered.length > 0;

  function navigate(slug: string, label: string) {
    setFocused(false);
    startTransition(async () => {
      await logSearch(label);
      router.push(`/app/intelligence/${slug}`);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    const match =
      topics.find((t) => t.title.toLowerCase() === trimmed || t.slug === trimmed) ??
      filtered[0];
    if (match) navigate(match.slug, query.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  }

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
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Search a market, topic, or industry..."
            className="w-full h-[52px] bg-surface-container-low border-none rounded-lg pl-14 pr-14 text-on-background placeholder:text-outline text-base focus:outline-none focus:ring-1 focus:ring-primary/40 shadow-xl shadow-black/20 transition-all"
          />
        </form>

        {/* Autocomplete dropdown */}
        {showDropdown && (
          <div
            className="w-full mt-2 bg-surface-container-low rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-outline-variant/10"
          >
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
          </div>
        )}

        {/* Trending chips */}
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

        {/* Fallback chips when trending_topics table is empty */}
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
      </div>
    </div>
  );
}
