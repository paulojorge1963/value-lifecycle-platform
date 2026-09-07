import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getCurrentUser, can } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LeftRail } from "@/components/LeftRail";
import { TopBar } from "@/components/TopBar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Value Lifecycle Platform",
  description: "End-to-end workspace for Value Engineers and Value Realization Managers.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isAdmin = !!user && can(user.role, "team.manage");
  const org = user ? await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }) : null;

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        {user ? (
          <div className="flex h-screen overflow-hidden">
            <LeftRail isAdmin={isAdmin} orgName={org?.name} />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar user={{ name: user.name, role: user.role }} />
              <main className="min-h-0 flex-1 overflow-auto">
                <div className="mx-auto max-w-7xl animate-fade-in-up px-4 py-8">{children}</div>
              </main>
            </div>
          </div>
        ) : (
          <main className="min-h-screen">{children}</main>
        )}
      </body>
    </html>
  );
}
