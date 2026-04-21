export default function Home() {
  return (
    <main className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center gap-8 p-8">
      {/* Logo mark */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center">
          <span className="text-on-primary-container text-lg font-bold font-headline">T</span>
        </div>
        <h1 className="text-3xl font-bold font-headline text-on-background tracking-tight">
          Sovereign Intelligence Terminal
        </h1>
      </div>

      {/* Status badge */}
      <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
        Market Pulse: Active
      </p>

      {/* Surface layer demo */}
      <div className="bg-surface-container-low rounded-xl p-8 max-w-lg w-full space-y-4">
        <div className="border-l-4 border-primary pl-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-1">
            System Status
          </p>
          <p className="text-on-background font-headline text-lg font-semibold">
            Design system online.
          </p>
          <p className="text-on-surface-variant text-sm mt-1">
            Sovereign Lens tokens are active. Ready to build.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="bg-surface-container-high rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Primary</p>
            <div className="w-full h-4 rounded bg-primary" />
          </div>
          <div className="bg-surface-container-high rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Error</p>
            <div className="w-full h-4 rounded bg-error" />
          </div>
          <div className="bg-surface-container-high rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Tertiary</p>
            <div className="w-full h-4 rounded bg-tertiary" />
          </div>
        </div>
      </div>

      <p className="text-on-surface-variant text-xs">
        Edit{" "}
        <code className="bg-surface-container-low px-1.5 py-0.5 rounded text-primary">
          src/app/page.tsx
        </code>{" "}
        to start building.
      </p>
    </main>
  );
}
