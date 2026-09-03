import Link from "next/link";
import { getCurrentUser, can } from "@/lib/session";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { NavLinks } from "@/components/NavLinks";

const ROLE_LABEL: Record<string, string> = {
  VALUE_ENGINEER: "Value Engineer",
  VALUE_REALIZATION_MANAGER: "Value Realization Mgr",
  CUSTOMER_SUCCESS_MANAGER: "Customer Success Mgr",
  REVIEWER: "Reviewer",
  VIEWER: "Viewer",
  ADMIN: "Admin",
};

export async function Nav() {
  const user = await getCurrentUser();
  const isAdmin = !!user && can(user.role, "team.manage");
  const org = user ? await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2.5">
        <Link href={user ? "/portfolio" : "/login"} className="flex items-center gap-2.5 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-ink-800 to-ink-950 text-sm font-bold text-white shadow-soft">V</span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-ink-900">Value Lifecycle</span>
            {org && <span className="block text-[11px] font-normal text-ink-400">{org.name}</span>}
          </span>
        </Link>

        {user && <NavLinks isAdmin={isAdmin} />}

        <div className="ml-auto">
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden text-right leading-tight sm:block">
                <div className="text-sm font-medium text-ink-900">{user.name}</div>
                <div className="text-xs text-ink-400">{ROLE_LABEL[user.role] ?? user.role}</div>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-xs font-semibold text-ink-600 ring-1 ring-ink-200">
                {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </span>
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
