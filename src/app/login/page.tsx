import { prisma } from "@/lib/db";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // The demo-role quick sign-ins all belong to the seeded demo workspace —
  // surface its name so it's clear which workspace those buttons enter.
  const demoOrg = await prisma.organization.findUnique({ where: { id: "org_demo" }, select: { name: true } });

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-lg font-bold text-white">V</div>
        <h1 className="text-2xl font-bold text-ink-900">Value Lifecycle Platform</h1>
        <p className="mt-1 text-sm text-ink-500">Sign in to your value-engineering &amp; realization workspace.</p>
      </div>
      <div className="card card-pad">
        <LoginForm demoWorkspace={demoOrg?.name ?? null} />
      </div>
    </div>
  );
}
