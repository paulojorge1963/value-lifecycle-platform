import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Value Lifecycle Platform",
  description: "End-to-end workspace for Value Engineers and Value Realization Managers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <div className="min-h-screen">
          <Nav />
          <main className="mx-auto max-w-7xl animate-fade-in-up px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
