import Link from "next/link";
import { getCurrentUser, can } from "@/lib/session";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";

const LINKS = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/ve", label: "Value Engineering", accent: "ve" },
  { href: "/vr", label: "Value Realization", accent: "vr" },
  { href: "/kpis", label: "KPIs" },
  { href: "/templates", label: "Templates" },
];

const ROLE_LABEL: Record<string, string> = {
  VALUE_ENGINEER: "Value Engineer",
  VALUE_REALIZATION_MANAGER: "Value Realization Mgr",
  REVIEWER: "Reviewer",
  VIEWER: "Viewer",
  ADMIN: "Admin",
};

export async function Nav() {
  const user = await getCurrentUser();
  const isAdmin = !!user && can(user.role, "team.manage");
  const org = user ? await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link href={user ? "/portfolio" : "/login"} className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-900 text-xs font-bold text-white">V</span>
          <span className="hidden leading-tight sm:block">
            <span className="block">Value Lifecycle</span>
            {org && <span className="block text-[11px] font-normal text-ink-400">{org.name}</span>}
          </span>
        </Link>

        {user && (
          <nav className="flex items-center gap-1 text-sm">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 font-medium text-ink-600 hover:bg-ink-100 ${
                  l.accent === "ve" ? "hover:text-ve-700" : l.accent === "vr" ? "hover:text-vr-700" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/settings/team" className="rounded-lg px-3 py-1.5 font-medium text-ink-600 hover:bg-ink-100">
                Team
              </Link>
            )}
          </nav>
        )}

        <div className="ml-auto">
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <div className="text-sm font-medium text-ink-900">{user.name}</div>
                <div className="text-xs text-ink-400">{ROLE_LABEL[user.role] ?? user.role}</div>
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button className="btn-ghost">Sign out</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
