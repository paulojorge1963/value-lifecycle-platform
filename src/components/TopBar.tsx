import { signOut } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  VALUE_ENGINEER: "Value Engineer",
  VALUE_REALIZATION_MANAGER: "Value Realization Mgr",
  CUSTOMER_SUCCESS_MANAGER: "Customer Success Mgr",
  REVIEWER: "Reviewer",
  VIEWER: "Viewer",
  ADMIN: "Admin",
};

export function TopBar({ user }: { user: { name: string; role: string } }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-end gap-3 border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-md">
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
    </header>
  );
}
