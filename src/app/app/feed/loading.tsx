export default function FeedLoading() {
  return (
    <div className="space-y-0 -mx-8 -mt-8 animate-pulse">
      {/* ── TOP BAR skeleton ── */}
      <div className="sticky top-0 z-30 w-full h-14 px-8 flex justify-between items-center glass-nav border-b border-surface-variant/15">
        <div className="flex items-center gap-8">
          {/* Logo placeholder */}
          <div className="h-5 w-36 bg-muted rounded" />
          {/* Nav tab placeholders */}
          <div className="hidden md:flex gap-6">
            {(["w-20", "w-[72px]", "w-[68px]"] as const).map((w, i) => (
              <div key={i} className={`h-3.5 rounded bg-muted ${w}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Search input placeholder */}
          <div className="h-8 w-64 bg-muted rounded-sm" />
          {/* Icon placeholders */}
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="h-8 w-8 rounded-full bg-muted" />
          {/* Avatar placeholder */}
          <div className="w-8 h-8 rounded-full bg-muted" />
        </div>
      </div>

      {/* ── SEARCH SUMMARY skeleton ── */}
      <div className="px-8 py-6">
        <div className="h-4 w-48 bg-muted rounded" />
      </div>

      {/* ── MAIN CONTENT skeleton ── */}
      <div className="px-8 pb-12 flex gap-8">
        {/* Left: feed table skeleton */}
        <section className="w-2/3">
          <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left border-collapse">
              {/* Header row */}
              <thead>
                <tr className="bg-surface-container-highest/50">
                  {(["w-40", "w-20", "w-14", "w-[60px]", "w-[88px]", "w-[72px]"] as const).map((w, i) => (
                    <th key={i} className="px-6 py-4">
                      <div className={`h-3 rounded bg-muted ${w}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              {/* 8 placeholder rows */}
              <tbody className="divide-y divide-outline-variant/15">
                {Array.from({ length: 8 }).map((_, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-surface-container-high/40">
                    {/* Post column: thumbnail + title */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded bg-muted shrink-0" />
                        <div className="space-y-2">
                          <div className="h-3.5 w-40 bg-muted rounded" />
                          <div className="h-3 w-28 bg-muted rounded" />
                        </div>
                      </div>
                    </td>
                    {/* Creator */}
                    <td className="px-6 py-4">
                      <div className="h-3.5 w-20 bg-muted rounded" />
                    </td>
                    {/* Signals */}
                    <td className="px-6 py-4">
                      <div className="h-3.5 w-8 bg-muted rounded" />
                    </td>
                    {/* Urgency badge */}
                    <td className="px-6 py-4">
                      <div className="h-5 w-14 bg-muted rounded-full" />
                    </td>
                    {/* Posted */}
                    <td className="px-6 py-4">
                      <div className="h-3.5 w-20 bg-muted rounded" />
                    </td>
                    {/* Platform */}
                    <td className="px-6 py-4">
                      <div className="h-3.5 w-16 bg-muted rounded" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: detail panel skeleton */}
        <section className="w-1/3">
          <div
            className="sticky top-20 bg-surface-container-low rounded-xl p-6 shadow-2xl space-y-8 border-l border-outline-variant/10"
          >
            {/* Panel header */}
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 bg-muted" />
                  <div className="h-6 w-40 bg-muted rounded" />
                </div>
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
              <div className="w-6 h-6 bg-muted rounded-sm" />
            </div>

            {/* Sparkline placeholder */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="h-3 w-28 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
              <div className="h-24 w-full bg-muted rounded-sm" />
            </div>

            {/* Breakdown chips */}
            <div className="space-y-4">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="flex flex-wrap gap-2">
                {(["w-[88px]", "w-[100px]", "w-32", "w-24"] as const).map((w, i) => (
                  <div key={i} className={`h-7 bg-muted rounded-sm ${w}`} />
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-muted rounded-sm" />
              <div className="h-10 bg-muted rounded-sm" />
            </div>

            {/* In the news */}
            <div className="pt-8 space-y-6 border-t border-outline-variant/15">
              <div className="h-3 w-24 bg-muted rounded" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-16 h-16 shrink-0 rounded bg-muted" />
                  <div className="flex flex-col justify-between flex-1 space-y-2">
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-4/5 bg-muted rounded" />
                    <div className="h-2.5 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
