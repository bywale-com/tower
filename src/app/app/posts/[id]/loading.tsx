export default function PostLoading() {
  return (
    <div className="grid grid-cols-12 gap-8 max-w-[1400px] mx-auto animate-pulse">
      {/* ── LEFT COLUMN ── */}
      <section className="col-span-12 lg:col-span-7 space-y-8">
        {/* Video / thumbnail placeholder */}
        <div className="relative rounded-xl overflow-hidden bg-surface-container-low shadow-2xl">
          <div className="w-full aspect-video bg-muted" />
        </div>

        {/* Creator attribution row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
            <div className="space-y-2">
              {/* Username */}
              <div className="h-4 w-28 bg-muted rounded" />
              {/* Followers */}
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
          </div>
          {/* View on platform link */}
          <div className="h-4 w-32 bg-muted rounded" />
        </div>

        {/* Caption block */}
        <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
          <div className="h-3.5 w-full bg-muted rounded" />
          <div className="h-3.5 w-11/12 bg-muted rounded" />
          <div className="h-3.5 w-4/5 bg-muted rounded" />
          {/* Hashtag chips */}
          <div className="flex flex-wrap gap-2 pt-2">
            {(["w-[72px]", "w-[88px]", "w-16", "w-24", "w-20"] as const).map((w, i) => (
              <div key={i} className={`h-5 bg-muted rounded ${w}`} />
            ))}
          </div>
        </div>

        {/* 4-stat grid */}
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2 border-b border-primary/5"
            >
              <div className="h-2.5 w-14 bg-muted rounded" />
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>

        {/* Transcript + Tower's Read */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transcript */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
            <div className="h-48 bg-surface-container-low rounded-xl p-4 space-y-3">
              {(["w-full", "w-[90%]", "w-[95%]", "w-[88%]", "w-[92%]"] as const).map((w, i) => (
                <div key={i} className={`h-3 bg-muted rounded ${w}`} />
              ))}
            </div>
          </div>

          {/* Tower's Read */}
          <div className="space-y-4">
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-48 bg-primary/10 rounded-xl border border-primary/20 p-5 space-y-3 flex flex-col justify-center">
              {(["w-[92%]", "w-full", "w-[88%]", "w-[76%]"] as const).map((w, i) => (
                <div key={i} className={`h-3 bg-muted rounded ${w}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RIGHT COLUMN ── */}
      <section className="col-span-12 lg:col-span-5 space-y-8">
        {/* Urgency gauge placeholder */}
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
          {/* SVG ring placeholder */}
          <div className="w-40 h-40 rounded-full bg-muted" />
          {/* Urgency label */}
          <div className="h-5 w-36 bg-muted rounded" />
          {/* Sub-label */}
          <div className="h-3 w-48 bg-muted rounded" />
          {/* Creator score bar */}
          <div
            className="mt-6 w-full pt-6 flex justify-between items-center px-4 border-t border-primary/10"
          >
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 bg-muted rounded-full" />
              <div className="h-4 w-8 bg-muted rounded" />
            </div>
          </div>
        </div>

        {/* Demand signals panel placeholder */}
        <div
          className="bg-surface-container-low rounded-xl overflow-hidden border border-primary/5"
        >
          {/* Panel header */}
          <div className="p-6 bg-surface-container-high/50 flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="w-6 h-6 bg-muted rounded" />
          </div>

          {/* Signal cards */}
          <div className="p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-highest/40 p-4 rounded-lg border-l-2 border-muted"
              >
                {/* Top row: time + badges */}
                <div className="flex justify-between items-start mb-3">
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="flex gap-2">
                    <div className="h-4 w-16 bg-muted rounded-sm" />
                    <div className="h-4 w-20 bg-muted rounded-sm" />
                  </div>
                </div>
                {/* Signal text lines */}
                <div className="space-y-2 mb-4">
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-10/12 bg-muted rounded" />
                </div>
                {/* Claim button placeholder */}
                <div className="h-8 w-full bg-muted rounded-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer metadata */}
        <div className="space-y-2">
          <div className="h-3 w-48 bg-muted rounded" />
          <div className="h-3 w-40 bg-muted rounded" />
        </div>
      </section>
    </div>
  );
}
