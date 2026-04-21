"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app/discover",     label: "Discover",        icon: "search" },
  { href: "/app/intelligence", label: "Intelligence",    icon: "query_stats" },
  { href: "/app/feed",         label: "Trending Feed",   icon: "trending_up" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex bg-background min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-[240px] bg-surface-container-lowest flex flex-col py-8 z-50">
        {/* Brand */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container text-sm">terminal</span>
            </div>
            <h1 className="text-lg font-black text-on-background font-headline tracking-tighter">
              Tower
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
            Market Pulse: Active
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "py-3 px-6 flex items-center gap-3 transition-all font-headline text-sm tracking-tight",
                  isActive
                    ? "text-on-background font-semibold bg-surface-container-low border-l-2 border-primary"
                    : "text-on-surface-variant hover:text-on-background"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined",
                    isActive ? "text-primary" : ""
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-4 mt-auto">
          <button className="w-full py-3 bg-primary-container text-on-primary-container rounded-lg font-bold text-sm hover:opacity-90 transition-opacity mb-6">
            New Inquiry
          </button>
          <div className="flex flex-col gap-1 pt-4" style={{ borderTop: "1px solid rgba(67,70,84,0.2)" }}>
            <Link href="#" className="text-on-surface-variant hover:text-on-background py-2 px-2 flex items-center gap-3 text-sm font-headline">
              <span className="material-symbols-outlined text-lg">account_circle</span>
              Account
            </Link>
            <Link href="#" className="text-on-surface-variant hover:text-on-background py-2 px-2 flex items-center gap-3 text-sm font-headline">
              <span className="material-symbols-outlined text-lg">logout</span>
              Logout
            </Link>
          </div>
        </div>
      </aside>

      {/* Main canvas */}
      <div className="flex-1 ml-[240px] flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 w-full z-40 glass-nav flex justify-between items-center h-14 px-8">
          <span className="text-xl font-bold tracking-tighter text-on-background font-headline uppercase">
            Sovereign Intelligence
          </span>
          <div className="flex items-center gap-4">
            <button className="text-on-surface-variant hover:text-on-background transition-colors p-1 flex items-center">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-on-surface-variant hover:text-on-background transition-colors p-1 flex items-center">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center ml-2">
              <span className="material-symbols-outlined text-on-surface text-sm">person</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>

      {/* Google Material Symbols */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24; display: inline-flex; }`}
      </style>
    </div>
  );
}
