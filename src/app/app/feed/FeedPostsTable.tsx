"use client";

import { useRouter } from "next/navigation";

type FeedPost = {
  id: string;
  title: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  urgency_score: number | null;
  analyzed_signal_count: number | null;
  surface_username: string | null;
  platform: string | null;
};

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function postLabel(title: string | null, caption: string | null): string {
  if (title && title.trim().length > 0) return title;
  if (!caption) return "Untitled post";
  const trimmed = caption.trim();
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}...` : trimmed;
}

function urgencyBadge(score: number | null): { label: string; classes: string } {
  if (score === null || score === undefined) {
    return { label: "Low", classes: "bg-surface-container-highest text-outline" };
  }
  if (score >= 70) {
    return { label: "Critical", classes: "bg-error/20 text-error border border-error/30" };
  }
  if (score >= 40) {
    return { label: "High", classes: "bg-error/15 text-error/90 border border-error/20" };
  }
  if (score >= 20) {
    return { label: "Med", classes: "bg-primary/15 text-primary border border-primary/20" };
  }
  return { label: "Low", classes: "bg-surface-container-highest text-outline" };
}

export default function FeedPostsTable({ feedRows }: { feedRows: FeedPost[] }) {
  const router = useRouter();

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-surface-container-highest/50">
          {["Post", "Creator", "Signals", "Urgency", "Posted", "Platform"].map((h) => (
            <th key={h} className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-outline">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant/15">
        {feedRows.map((row, i) => {
          const badge = urgencyBadge(row.urgency_score);
          return (
            <tr
              key={row.id}
              className={`transition-colors cursor-pointer ${
                i === 0
                  ? "bg-surface-container-high/40 border-l-[3px] border-primary-container hover:bg-surface-container-high"
                  : "hover:bg-surface-container-high/40"
              }`}
              onClick={() => router.push(`/app/posts/${row.id}`)}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {row.thumbnail_url ? (
                    <img
                      src={row.thumbnail_url}
                      alt={postLabel(row.title, row.caption)}
                      className="w-12 h-12 rounded object-cover bg-surface-container-highest"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-surface-container-highest" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-headline font-bold text-on-surface line-clamp-2">
                      {postLabel(row.title, row.caption)}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">
                @{row.surface_username ?? "unknown"}
              </td>
              <td className="px-6 py-4 text-sm font-mono text-primary">
                {row.analyzed_signal_count ?? 0}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${badge.classes}`}>
                  {badge.label}
                </span>
              </td>
              <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">{relativeTime(row.posted_at)}</td>
              <td className="px-6 py-4 text-sm font-mono text-outline">{row.platform ?? "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
