"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateValueStory, type ValueStory } from "@/lib/actions";

type Priority = { title: string; bullets: string[] };
type Driver = { driver: string; enabler: string };
type Stat = { label: string; value: string };
type Member = { name: string; role: string };

const DEFAULT_STATS: Stat[] = [
  { label: "Total hours", value: "" },
  { label: "Technical workshops", value: "" },
  { label: "Interviews", value: "" },
  { label: "Analysis & documentation", value: "" },
];

export function ValueStoryEditor({
  studyId, canEdit, whyNow, whyThisSolution, valueStory,
}: {
  studyId: string;
  canEdit: boolean;
  whyNow: string | null;
  whyThisSolution: string | null;
  valueStory: ValueStory | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [why1, setWhy1] = useState(whyNow ?? "");
  const [why2, setWhy2] = useState(whyThisSolution ?? "");
  const [priorities, setPriorities] = useState<Priority[]>(
    valueStory?.priorities?.length ? valueStory.priorities : [{ title: "", bullets: [] }, { title: "", bullets: [] }, { title: "", bullets: [] }]
  );
  const [quote, setQuote] = useState(valueStory?.priorityQuote ?? "");
  const [quoteBy, setQuoteBy] = useState(valueStory?.priorityQuoteBy ?? "");
  const [drivers, setDrivers] = useState<Driver[]>(valueStory?.drivers?.length ? valueStory.drivers : [{ driver: "", enabler: "" }]);
  const [stats, setStats] = useState<Stat[]>(valueStory?.collabStats?.length ? valueStory.collabStats : DEFAULT_STATS);
  const [team, setTeam] = useState<Member[]>(valueStory?.deliveryTeam?.length ? valueStory.deliveryTeam : [{ name: "", role: "" }]);

  function save() {
    start(async () => {
      setErr(null);
      try {
        const vs: ValueStory = {
          priorities: priorities.map((p) => ({ title: p.title.trim(), bullets: p.bullets.map((b) => b.trim()).filter(Boolean) })).filter((p) => p.title || p.bullets.length),
          priorityQuote: quote.trim() || undefined,
          priorityQuoteBy: quoteBy.trim() || undefined,
          drivers: drivers.map((d) => ({ driver: d.driver.trim(), enabler: d.enabler.trim() })).filter((d) => d.driver || d.enabler),
          collabStats: stats.map((s) => ({ label: s.label.trim(), value: s.value.trim() })).filter((s) => s.value),
          deliveryTeam: team.map((m) => ({ name: m.name.trim(), role: m.role.trim() })).filter((m) => m.name),
        };
        await updateValueStory(studyId, { whyNow: why1.trim() || null, whyThisSolution: why2.trim() || null, valueStory: vs });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  const captured = !!(whyNow || whyThisSolution || valueStory?.priorities?.length || valueStory?.drivers?.length || valueStory?.deliveryTeam?.length || valueStory?.collabStats?.length);

  if (!editing) {
    return (
      <div className="card card-pad">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink-900">Value story</h2>
            <p className="mt-0.5 text-sm text-ink-500">The narrative the Collaborative Value Review (CVR) is built from — why now, priorities, drivers, and who was involved.</p>
          </div>
          {canEdit && <button className="btn-ghost shrink-0" onClick={() => setEditing(true)}>{captured ? "Edit" : "+ Capture"}</button>}
        </div>
        {captured ? (
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {whyNow && <div><span className="label">Why now</span><p className="mt-0.5 text-ink-700">{whyNow}</p></div>}
            {whyThisSolution && <div><span className="label">Why this solution</span><p className="mt-0.5 text-ink-700">{whyThisSolution}</p></div>}
            {!!valueStory?.priorities?.length && (
              <div className="sm:col-span-2"><span className="label">Priorities</span>
                <ul className="mt-0.5 grid gap-2 sm:grid-cols-3">
                  {valueStory.priorities.map((p, i) => (
                    <li key={i} className="rounded border border-ink-100 p-2">
                      <div className="font-medium text-ink-800">{p.title || `Priority ${i + 1}`}</div>
                      <ul className="mt-0.5 list-disc pl-4 text-xs text-ink-600">{p.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
                    </li>
                  ))}
                </ul>
                {valueStory.priorityQuote && <p className="mt-1.5 text-ink-600 italic">“{valueStory.priorityQuote}”{valueStory.priorityQuoteBy ? ` — ${valueStory.priorityQuoteBy}` : ""}</p>}
              </div>
            )}
            {!!valueStory?.drivers?.length && (
              <div><span className="label">Drivers & enablers</span>
                <ul className="mt-0.5 space-y-0.5 text-xs text-ink-600">{valueStory.drivers.map((d, i) => <li key={i}><b className="text-ink-800">{d.driver}</b> → {d.enabler}</li>)}</ul>
              </div>
            )}
            {!!valueStory?.deliveryTeam?.length && (
              <div><span className="label">Delivery team</span>
                <ul className="mt-0.5 space-y-0.5 text-xs text-ink-600">{valueStory.deliveryTeam.map((m, i) => <li key={i}><b className="text-ink-800">{m.name}</b>{m.role ? ` — ${m.role}` : ""}</li>)}</ul>
              </div>
            )}
            {!!valueStory?.collabStats?.length && (
              <div className="sm:col-span-2"><span className="label">Collaboration</span>
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-ink-600">{valueStory.collabStats.map((s, i) => <span key={i}><b className="text-ink-800">{s.value}</b> {s.label}</span>)}</div>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-500">Not captured yet.{canEdit ? " Capture it to fill the CVR’s executive-summary and understanding slides." : ""}</p>
        )}
      </div>
    );
  }

  const row = "grid gap-2 sm:grid-cols-2";
  return (
    <div className="card card-pad">
      <h2 className="font-semibold text-ink-900">Value story</h2>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <div className="mt-3 space-y-4">
        <div className={row}>
          <div><label className="label">Why now</label><textarea value={why1} onChange={(e) => setWhy1(e.target.value)} rows={3} className="input mt-1" placeholder="The trigger / compelling event that makes this urgent" /></div>
          <div><label className="label">Why this solution</label><textarea value={why2} onChange={(e) => setWhy2(e.target.value)} rows={3} className="input mt-1" placeholder="Why the chosen solution & partner are the right answer" /></div>
        </div>

        <div>
          <label className="label">Priorities (3 columns — one bullet per line)</label>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {priorities.map((p, i) => (
              <div key={i} className="rounded border border-ink-100 p-2">
                <input value={p.title} onChange={(e) => setPriorities(priorities.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} className="input" placeholder={`Priority ${i + 1} title`} />
                <textarea value={p.bullets.join("\n")} onChange={(e) => setPriorities(priorities.map((x, j) => j === i ? { ...x, bullets: e.target.value.split("\n") } : x))} rows={3} className="input mt-1 text-sm" placeholder={"Detail one\nDetail two"} />
              </div>
            ))}
          </div>
          <div className={`${row} mt-2`}>
            <div><label className="label">Customer quote</label><textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={2} className="input mt-1" /></div>
            <div><label className="label">Quote attribution</label><input value={quoteBy} onChange={(e) => setQuoteBy(e.target.value)} className="input mt-1" placeholder="Name, title" /></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between"><label className="label">Business drivers & enablers</label><button className="btn-ghost text-xs" onClick={() => setDrivers([...drivers, { driver: "", enabler: "" }])}>+ Add</button></div>
          <div className="mt-1 space-y-1.5">
            {drivers.map((d, i) => (
              <div key={i} className="flex gap-2">
                <input value={d.driver} onChange={(e) => setDrivers(drivers.map((x, j) => j === i ? { ...x, driver: e.target.value } : x))} className="input" placeholder="Business driver" />
                <input value={d.enabler} onChange={(e) => setDrivers(drivers.map((x, j) => j === i ? { ...x, enabler: e.target.value } : x))} className="input" placeholder="Digital use case / enabler" />
                <button className="btn px-2 text-red-500 hover:bg-red-50" onClick={() => setDrivers(drivers.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className={row}>
          <div>
            <label className="label">Collaboration stats</label>
            <div className="mt-1 space-y-1.5">
              {stats.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input value={s.label} onChange={(e) => setStats(stats.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className="input" placeholder="Label" />
                  <input value={s.value} onChange={(e) => setStats(stats.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} className="input w-24" placeholder="e.g. 64" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between"><label className="label">Delivery team</label><button className="btn-ghost text-xs" onClick={() => setTeam([...team, { name: "", role: "" }])}>+ Add</button></div>
            <div className="mt-1 space-y-1.5">
              {team.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input value={m.name} onChange={(e) => setTeam(team.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="input" placeholder="Name" />
                  <input value={m.role} onChange={(e) => setTeam(team.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} className="input" placeholder="Role" />
                  <button className="btn px-2 text-red-500 hover:bg-red-50" onClick={() => setTeam(team.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn border border-ink-200 px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-100" onClick={() => setEditing(false)}>Cancel</button>
        <button className="btn-ve" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save value story"}</button>
      </div>
    </div>
  );
}
