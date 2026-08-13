import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { TeamManager } from "@/components/TeamManager";
import { SectionHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "team.manage")) redirect("/portfolio");

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    include: {
      users: { include: { memberships: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!org) redirect("/portfolio");

  const members = org.users.map((u) => {
    const m = u.memberships.find((x) => x.organizationId === org.id) ?? u.memberships[0];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      title: u.title,
      role: (m?.role as string) ?? "VIEWER",
      self: u.id === user.id,
    };
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Team"
        desc={`Manage members and roles for ${org.name}. As an administrator you can add teammates, change their roles, reset passwords, and remove access.`}
      />
      <TeamManager members={members} />
    </div>
  );
}
