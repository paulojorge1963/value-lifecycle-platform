"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Minimal inline icons (no runtime dependency).
const I = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3z",
  trend: "M3 17l6-6 4 4 8-8M21 7h-5M21 7v5",
  heart: "M20.8 8.6a5 5 0 0 0-8.8-3 5 5 0 0 0-8.8 3c0 4 4.6 7.2 8.8 10.6 4.2-3.4 8.8-6.6 8.8-10.6z",
  chart: "M4 20V10M10 20V4M16 20v-7M20 20H2",
  book: "M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3zM18 7v13",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.4 2H9.6L9.2 4.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4.8l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z",
};

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

const NAV: { href: string; label: string; icon: keyof typeof I }[] = [
  { href: "/portfolio", label: "Portfolio", icon: "grid" },
  { href: "/ve", label: "Value Engineering", icon: "wrench" },
  { href: "/vr", label: "Value Realization", icon: "trend" },
  { href: "/cs", label: "Customer Success", icon: "heart" },
  { href: "/kpis", label: "KPIs", icon: "chart" },
  { href: "/templates", label: "Templates", icon: "book" },
];

export function LeftRail({ isAdmin, orgName }: { isAdmin: boolean; orgName?: string | null }) {
  const pathname = usePathname() ?? "";
  const links = [...NAV, ...(isAdmin ? [{ href: "/settings/team", label: "Team", icon: "gear" as const }] : [])];

  return (
    <aside className="flex w-[228px] shrink-0 flex-col bg-rail text-railfg">
      <Link href="/portfolio" className="flex items-center gap-2.5 px-4 py-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-bmc-500 to-bmc-700 text-sm font-bold text-white shadow-soft">V</span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-white">Value Lifecycle</span>
          <span className="block text-[10px] uppercase tracking-wider text-railfg/60">{orgName ?? "Platform"}</span>
        </span>
      </Link>

      <nav className="mt-2 flex-1 px-2">
        <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-railfg/45">Workspaces</div>
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
                active ? "bg-white/10 font-medium text-white" : "text-railfg/85 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-bmc-500" aria-hidden />}
              <Icon d={I[icon]} className={active ? "text-bmc-400" : "opacity-80"} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-3 text-[10px] text-railfg/50">VE · VR · Customer Success</div>
    </aside>
  );
}
