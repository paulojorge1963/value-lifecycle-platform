"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Accent = "ve" | "vr" | "cs" | "ink";
const LINKS: { href: string; label: string; accent: Accent }[] = [
  { href: "/portfolio", label: "Portfolio", accent: "ink" },
  { href: "/ve", label: "Value Engineering", accent: "ve" },
  { href: "/vr", label: "Value Realization", accent: "vr" },
  { href: "/cs", label: "Customer Success", accent: "cs" },
  { href: "/kpis", label: "KPIs", accent: "ink" },
  { href: "/templates", label: "Templates", accent: "ink" },
];

const ACTIVE: Record<Accent, string> = {
  ve: "bg-ve-50 text-ve-700 ring-ve-100",
  vr: "bg-vr-50 text-vr-700 ring-vr-100",
  cs: "bg-cs-50 text-cs-700 ring-cs-100",
  ink: "bg-ink-100 text-ink-900 ring-ink-200",
};
const HOVER: Record<Accent, string> = {
  ve: "hover:text-ve-700",
  vr: "hover:text-vr-700",
  cs: "hover:text-cs-700",
  ink: "",
};

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "";
  const links = [...LINKS, ...(isAdmin ? [{ href: "/settings/team", label: "Team", accent: "ink" as Accent }] : [])];

  return (
    <nav className="flex items-center gap-0.5 text-sm">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              active
                ? `${ACTIVE[l.accent]} ring-1 ring-inset`
                : `text-ink-600 hover:bg-ink-100 ${HOVER[l.accent]}`
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
