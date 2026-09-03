// FAST diagram — Function Analysis System Technique.
// Renders the function model as a how/why logic tree: moving right answers
// "How?", moving left answers "Why?". Higher-order (basic) functions sit on the
// left; the functions that support them branch to the right.
//
// Pure server component: node sizes are fixed so the layout is deterministic
// (no client-side measuring needed). Connectors are drawn as SVG elbows behind
// absolutely-positioned HTML node boxes.

interface Fn {
  id: string;
  verb: string;
  noun: string;
  kind: string;
  cost: number | null;
  worth: number | null;
  parentId: string | null;
}

const NODE_W = 190;
const NODE_H = 76;
const H_GAP = 60;
const V_GAP = 24;

export function FastDiagram({ functions }: { functions: Fn[] }) {
  if (functions.length === 0) {
    return (
      <div className="card card-pad">
        <Header />
        <p className="mt-3 text-sm text-ink-500">No functions yet — add them in the function model to build the FAST diagram.</p>
      </div>
    );
  }

  const byId = new Map(functions.map((f) => [f.id, f]));
  const validParent = (f: Fn) => (f.parentId && byId.has(f.parentId) ? f.parentId : null);

  // children map keyed by parent id (roots under "__root__")
  const childrenMap = new Map<string, string[]>();
  for (const f of functions) {
    const key = validParent(f) ?? "__root__";
    (childrenMap.get(key) ?? childrenMap.set(key, []).get(key)!).push(f.id);
  }
  const roots = childrenMap.get("__root__") ?? [];

  // Tidy-ish layout: x by depth, y by leaf order (internal nodes centre on kids).
  const pos = new Map<string, { x: number; y: number }>();
  const seen = new Set<string>();
  let leaf = 0;
  function layout(id: string, depth: number): number {
    if (seen.has(id)) return 0; // defensive against malformed cycles
    seen.add(id);
    const kids = childrenMap.get(id) ?? [];
    const x = depth * (NODE_W + H_GAP);
    if (kids.length === 0) {
      const y = leaf * (NODE_H + V_GAP);
      leaf += 1;
      pos.set(id, { x, y });
      return y;
    }
    const ys = kids.map((k) => layout(k, depth + 1));
    const y = (ys[0] + ys[ys.length - 1]) / 2;
    pos.set(id, { x, y });
    return y;
  }
  roots.forEach((r) => layout(r, 0));
  // Any functions not reached (shouldn't happen) get parked as extra leaves.
  for (const f of functions) if (!pos.has(f.id)) layout(f.id, 0);

  const width = Math.max(...[...pos.values()].map((p) => p.x)) + NODE_W;
  const height = Math.max(...[...pos.values()].map((p) => p.y)) + NODE_H;

  const edges = functions
    .map((f) => {
      const p = validParent(f);
      if (!p) return null;
      const pp = pos.get(p)!;
      const cp = pos.get(f.id)!;
      const sx = pp.x + NODE_W;
      const sy = pp.y + NODE_H / 2;
      const ex = cp.x;
      const ey = cp.y + NODE_H / 2;
      const mx = sx + H_GAP / 2;
      return { key: f.id, d: `M ${sx} ${sy} H ${mx} V ${ey} H ${ex}` };
    })
    .filter(Boolean) as { key: string; d: string }[];

  return (
    <div className="card card-pad">
      <Header />
      <div className="mt-3 overflow-x-auto">
        <div className="relative" style={{ width, height, minWidth: "100%" }}>
          <svg width={width} height={height} className="absolute inset-0" style={{ pointerEvents: "none" }}>
            {edges.map((e) => (
              <path key={e.key} d={e.d} fill="none" stroke="#d4d4d8" strokeWidth={1.5} />
            ))}
          </svg>
          {functions.map((f) => {
            const p = pos.get(f.id)!;
            const idx = f.cost && f.worth ? f.cost / f.worth : null;
            const poor = idx != null && idx > 1.5;
            const basic = f.kind === "BASIC";
            return (
              <div
                key={f.id}
                className={`absolute rounded-lg border px-3 py-2 shadow-sm ${
                  basic ? "border-ve-300 bg-ve-50" : "border-ink-200 bg-white"
                }`}
                style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`badge ${basic ? "bg-ve-100 text-ve-700" : "bg-ink-100 text-ink-500"}`}>{f.kind.toLowerCase()}</span>
                  {idx != null && (
                    <span className={`text-xs font-semibold ${poor ? "text-amber-600" : "text-ink-400"}`}>idx {idx.toFixed(2)}</span>
                  )}
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-ink-900" title={`${f.verb} ${f.noun}`}>
                  {`${f.verb} ${f.noun}`.trim() || "Untitled function"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-semibold text-ink-900">FAST diagram</h2>
      <div className="flex items-center gap-3 text-xs text-ink-400">
        <span>← Why</span>
        <span className="h-px w-8 bg-ink-300" />
        <span>How →</span>
      </div>
    </div>
  );
}
