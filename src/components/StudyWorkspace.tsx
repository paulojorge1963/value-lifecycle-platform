"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = { activePhase: string; showAll: boolean };
const WsCtx = createContext<Ctx>({ activePhase: "", showAll: true });

const relevant = (phases: string[] | null, active: string) => phases === null || phases.includes(active);

export type SectionMeta = { id: string; title: string; phases: string[] | null };

/**
 * Study-page workspace shell: a sticky section index + a "phase view / show all"
 * toggle. In phase view only the sections relevant to the active phase show; the
 * rest stay mounted (hidden) so no in-progress edit state is lost on toggle.
 * Sections keep their existing server-rendered content — they're just wrapped in
 * <WorkspaceSection> so the shell can filter, anchor and collapse them.
 */
export function WorkspaceShell({
  activePhase,
  index,
  children,
}: {
  activePhase: string;
  index: SectionMeta[];
  children: ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = index.filter((i) => showAll || relevant(i.phases, activePhase));
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <WsCtx.Provider value={{ activePhase, showAll }}>
      <div className="space-y-5">
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-1.5 rounded-xl border border-ink-200 bg-white/92 px-3 py-2 shadow-sm backdrop-blur">
          <span className="label mr-1">Jump to</span>
          {visible.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => scrollTo(i.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                relevant(i.phases, activePhase) ? "bg-ve-50 text-ve-700 hover:bg-ve-100" : "bg-ink-50 text-ink-500 hover:bg-ink-100"
              }`}
            >
              {i.title}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="ml-auto rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-600 hover:bg-ink-50"
            title={showAll ? "Show only sections relevant to the current phase" : "Show every section"}
          >
            {showAll ? "Phase view" : `Show all (${index.length})`}
          </button>
        </div>
        {!showAll && visible.length <= 1 && (
          <p className="px-1 text-sm text-ink-500">
            No work objects for this phase yet — use <span className="font-medium text-ink-700">Show all</span> above, or work from the phase guidance.
          </p>
        )}
        {children}
      </div>
    </WsCtx.Provider>
  );
}

export function WorkspaceSection({
  id,
  title,
  phases,
  children,
}: {
  id: string;
  title: string;
  phases: string[] | null;
  children: ReactNode;
}) {
  const { activePhase, showAll } = useContext(WsCtx);
  const [open, setOpen] = useState(true);
  const rel = relevant(phases, activePhase);
  const visible = showAll || rel;
  return (
    <section id={id} hidden={!visible} className="scroll-mt-24">
      <div className="mb-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500 hover:text-ink-800"
          aria-expanded={open}
        >
          <span className={`inline-block text-[10px] transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
          {title}
        </button>
        {showAll && !rel && (
          <span className="rounded-full bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-400">other phase</span>
        )}
      </div>
      {open && children}
    </section>
  );
}
