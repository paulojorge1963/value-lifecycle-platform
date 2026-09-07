"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2 py-0.5 text-[11px] font-medium text-ink-600 shadow-soft hover:border-bmc-500 hover:text-bmc-700"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
