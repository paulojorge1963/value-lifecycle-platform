import { prisma } from "@/lib/db";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  VALUE_ENGINEER: "Value Engineer",
  VALUE_REALIZATION_MANAGER: "Value Realization Manager",
  CUSTOMER_SUCCESS_MANAGER: "Customer Success Manager",
  REVIEWER: "Reviewer",
  VIEWER: "Stakeholder / Viewer",
  ADMIN: "Administrator",
};

export default async function LoginPage() {
  // The sign-in screen can offer "pick a workspace → pick a member". That lists
  // member names/emails (and one-click demo sign-in), which is convenient for a
  // local demo but exposes accounts on a public deployment — so it's OFF in
  // production by default. Set SHOW_LOGIN_MEMBER_PICKER=true to re-enable it.
  const pickerEnabled =
    process.env.SHOW_LOGIN_MEMBER_PICKER === "true" || process.env.NODE_ENV !== "production";
  const orgs = pickerEnabled
    ? await prisma.organization.findMany({
        where: { showMembersOnLogin: true },
        include: { users: { include: { memberships: true }, orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  // The demo workspace offers one-click sign-in, which needs the shared demo
  // password on the client. It comes from DEMO_PASSWORD (the same variable the
  // seed uses) and is only sent when the picker is on — i.e. never in
  // production, where the picker is off by default.
  const demoPassword = pickerEnabled ? (process.env.DEMO_PASSWORD?.trim() || null) : null;
  const workspaces = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    isDemo: o.id === "org_demo",
    members: o.users.map((u) => {
      const m = u.memberships.find((x) => x.organizationId === o.id) ?? u.memberships[0];
      return { name: u.name, email: u.email, role: ROLE_LABEL[(m?.role as string) ?? "VIEWER"] ?? "Member" };
    }),
  }));

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-lg font-bold text-white">V</div>
        <h1 className="text-2xl font-bold text-ink-900">Value Lifecycle Platform</h1>
        <p className="mt-1 text-sm text-ink-500">Sign in to your value-engineering &amp; realization workspace.</p>
      </div>
      <div className="card card-pad">
        <LoginForm workspaces={workspaces} demoPassword={demoPassword} />
      </div>
    </div>
  );
}
