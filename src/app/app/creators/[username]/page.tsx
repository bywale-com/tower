import Link from "next/link";

const creator = {
  username: "tncimmigration",
  displayName: "@tncimmigration",
  verified: true,
  bio: "Specializing in Canadian economic immigration. Helping families navigate Express Entry, PNP, and Study Permits since 2014.",
  stats: [
    { label: "Total Posts", value: "876" },
    { label: "Inquiries Generated", value: "1,204" },
    { label: "Avg Urgency", value: "78", color: "text-error" },
    { label: "Followers", value: "42.5K" },
  ],
  chips: [
    { label: "POSTS: 876" },
    { label: "TRANSCRIBED: 412" },
  ],
  incumbencyScore: 74,
  incumbencyColor: "#4ade80",
  incumbencyClass: "text-green-400",
  signals: [
    {
      id: 1,
      thread: "Express Entry Thread",
      urgency: "89 Urgency",
      urgencyBg: "bg-error-container",
      urgencyText: "text-on-error-container",
      borderColor: "border-error",
      quote: '"My PGWP expires in 3 weeks, CRS is 492. Any hope for a category-based draw soon? Extremely anxious..."',
    },
    {
      id: 2,
      thread: "PNP Updates",
      urgency: "72 Urgency",
      urgencyBg: "bg-[#452d1c]",
      urgencyText: "text-[#fb923c]",
      borderColor: "border-[#fb923c]",
      quote: '"Applied for OINP 6 months ago, still no update. Is it normal to wait this long for a nomination?"',
    },
    {
      id: 3,
      thread: "Study Permit Hub",
      urgency: "94 Urgency",
      urgencyBg: "bg-error-container",
      urgencyText: "text-on-error-container",
      borderColor: "border-error",
      quote: '"Visa rejected twice already. Need a detailed SOP review before my final attempt. Please DM back!"',
    },
  ],
  posts: [
    {
      id: "reel_001",
      type: "Reel",
      typeBadge: "bg-blue-500/20 text-blue-400",
      time: "2 hours ago",
      title: "New Category-Based Draws Announced: What French speakers need to know for the upcoming week...",
      excerpt:
        "IRCC just released the numbers for the latest STEM and French language proficiency draws. The CRS cutoff is significantly lower than general draws. If you have a CLB 7...",
      metrics: [
        { icon: "comment", value: "142", color: "text-on-surface-variant" },
        { icon: "assessment", value: "84% Engagement", color: "text-on-surface-variant" },
        { icon: "error", value: "12 Critical Inquiries", color: "text-error" },
      ],
    },
    {
      id: "video_002",
      type: "Video",
      typeBadge: "bg-blue-500/20 text-blue-400",
      time: "Yesterday",
      title: "Complete Guide to BC PNP: International Post-Graduate Category requirements for 2026.",
      excerpt:
        "Navigating the British Columbia Provincial Nominee Program can be tricky for new graduates. Today we break down the scoring system and the priority list for tech...",
      metrics: [
        { icon: "comment", value: "89", color: "text-on-surface-variant" },
        { icon: "assessment", value: "76% Engagement", color: "text-on-surface-variant" },
        { icon: "priority_high", value: "4 High Value Leads", color: "text-[#fb923c]" },
      ],
    },
    {
      id: "reel_003",
      type: "Reel",
      typeBadge: "bg-blue-500/20 text-blue-400",
      time: "3 days ago",
      title: "Avoid these 5 common mistakes in your Express Entry profile to prevent rejection.",
      excerpt:
        "Mistakes in NOC coding or employment letters are the primary reason for profile rejection after receiving an ITA. We show you exactly how to format your...",
      metrics: [
        { icon: "comment", value: "204", color: "text-on-surface-variant" },
        { icon: "assessment", value: "91% Engagement", color: "text-on-surface-variant" },
        { icon: "error", value: "21 Urgent Clarifications", color: "text-error" },
      ],
    },
  ],
};

const scoreCircumference = 2 * Math.PI * 40; // r=40 → 251.2
const incumbencyOffset =
  scoreCircumference - (scoreCircumference * creator.incumbencyScore) / 100;

export default function CreatorPage({ params }: { params: { username: string } }) {
  return (
    <div className="grid grid-cols-12 gap-8 max-w-[1400px] mx-auto">
      {/* ── LEFT COLUMN ── */}
      <section className="col-span-12 lg:col-span-5 space-y-8">
        {/* Profile summary card */}
        <div className="bg-surface-container-low rounded-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-8xl">badge</span>
          </div>
          <div className="flex items-start gap-6 mb-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex-shrink-0 flex items-center justify-center bg-surface-container-highest text-2xl font-bold text-primary">
              T
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold font-headline text-on-background">
                  @{params.username}
                </h2>
                <span className="material-symbols-outlined text-blue-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed max-w-md line-clamp-3">
                {creator.bio}
              </p>
            </div>
          </div>

          {/* Chips */}
          <div className="flex gap-3 mb-8">
            {creator.chips.map((c) => (
              <div
                key={c.label}
                className="px-3 py-1 bg-surface-container-high rounded text-[10px] font-mono font-medium text-on-surface-variant border border-outline-variant/10"
              >
                {c.label}
              </div>
            ))}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {creator.stats.map((s) => (
              <div key={s.label} className="bg-background/40 p-4 rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">{s.label}</p>
                <p className={`text-2xl font-mono font-bold ${s.color ?? "text-on-background"}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Incumbency score */}
        <div className="bg-surface-container-low rounded-xl p-8 flex items-center justify-between">
          <div className="border-l-4 border-primary pl-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-on-surface-variant uppercase tracking-widest font-headline">
                Incumbency Score
              </span>
              <span className="material-symbols-outlined text-on-surface-variant text-sm cursor-help">info</span>
            </div>
            <div className={`text-5xl font-black font-headline ${creator.incumbencyClass}`}>
              {creator.incumbencyScore}/100
            </div>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-surface-container-highest" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
              <circle
                cx="48"
                cy="48"
                fill="transparent"
                r="40"
                stroke={creator.incumbencyColor}
                strokeDasharray={scoreCircumference}
                strokeDashoffset={incumbencyOffset}
                strokeWidth="8"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`material-symbols-outlined text-3xl ${creator.incumbencyClass}`}>
                trending_up
              </span>
            </div>
          </div>
        </div>

        {/* Recent demand signals */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-headline font-bold text-on-surface text-lg">Recent Demand Signals</h3>
            <span className="text-[10px] text-primary uppercase font-bold tracking-tighter">Live Stream</span>
          </div>
          <div className="space-y-3">
            {creator.signals.map((s) => (
              <div
                key={s.id}
                className={`bg-surface-container-low p-4 rounded-xl flex items-start gap-4 transition-all hover:bg-surface-container-high border-l-2 ${s.borderColor}`}
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-tighter">
                      {s.thread}
                    </span>
                    <div className={`px-2 py-0.5 ${s.urgencyBg} ${s.urgencyText} rounded text-[10px] font-bold`}>
                      {s.urgency}
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed italic">{s.quote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RIGHT COLUMN ── */}
      <section className="col-span-12 lg:col-span-7">
        <div className="bg-surface-container-low rounded-xl min-h-[800px] flex flex-col">
          {/* Header */}
          <div
            className="p-6 flex justify-between items-center border-b border-outline-variant/10"
          >
            <div>
              <h3 className="font-headline font-bold text-xl text-on-background tracking-tight">
                @{params.username}&apos;s Contributions
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Analytic processing of published assets</p>
            </div>
            <a href="#" className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1 uppercase tracking-wider">
              All Contributions{" "}
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          </div>

          {/* Date label */}
          <div className="px-6 py-4 bg-background/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant">calendar_today</span>
            <span className="text-sm font-headline font-bold text-on-surface uppercase tracking-widest">April 2026</span>
          </div>

          {/* Posts feed */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
            {creator.posts.map((post) => (
              <Link href={`/app/posts/${post.id}`} key={post.id}>
                <div className="group grid grid-cols-12 gap-6 bg-surface-container-high/40 p-4 rounded-lg transition-all hover:bg-surface-container-high cursor-pointer">
                  {/* Thumbnail */}
                  <div className="col-span-3 aspect-[9/16] rounded-md bg-surface-container-highest overflow-hidden relative flex-shrink-0">
                    <div className="w-full h-full bg-gradient-to-br from-surface-container to-surface-container-highest" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-4xl">play_circle</span>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="col-span-9 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 ${post.typeBadge} text-[10px] font-bold rounded uppercase tracking-tighter`}>
                        {post.type}
                      </span>
                      <span className="text-[10px] font-mono text-on-surface-variant">{post.time}</span>
                    </div>
                    <h4 className="text-on-background font-bold mb-2 line-clamp-2">{post.title}</h4>
                    <p className="text-xs text-on-surface-variant line-clamp-3 mb-4 leading-relaxed">{post.excerpt}</p>
                    <div
                      className="mt-auto flex items-center gap-4 pt-4 border-t border-outline-variant/10"
                    >
                      {post.metrics.map((m) => (
                        <div key={m.icon} className={`flex items-center gap-1 text-[10px] font-mono ${m.color}`}>
                          <span className="material-symbols-outlined text-sm">{m.icon}</span> {m.value}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
