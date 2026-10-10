"use client";

/**
 * Screen-only "Download PDF" control for the status report.
 * Uses the browser's print dialog (Save as PDF) — no server-side rendering
 * infrastructure needed, and the print CSS in globals.css hides app chrome.
 */
export function PrintButton({ className = "btn-ve" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()} title="Opens your browser's print dialog — choose “Save as PDF”.">
      Print / Save as PDF ↓
    </button>
  );
}
