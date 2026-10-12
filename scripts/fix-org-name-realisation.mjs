// One-off: rename any Organization whose name uses the US spelling "Realization"
// to British "Realisation" — the org name is what the sidebar logo renders
// (LeftRail.tsx -> {orgName}). Safe to re-run; it only touches matching rows.
//
// Usage (local):  node scripts/fix-org-name-realisation.mjs
// Usage (prod):   DATABASE_URL="<prod-url>" node scripts/fix-org-name-realisation.mjs
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const hits = await p.organization.findMany({
    where: { name: { contains: "Realization" } },
    select: { id: true, name: true },
  });
  if (hits.length === 0) {
    console.log("No organisations with 'Realization' in the name — nothing to do.");
  }
  for (const o of hits) {
    const renamed = o.name.replace(/Realization/g, "Realisation");
    await p.organization.update({ where: { id: o.id }, data: { name: renamed } });
    console.log(`renamed: "${o.name}" -> "${renamed}"`);
  }
} finally {
  await p.$disconnect();
}
