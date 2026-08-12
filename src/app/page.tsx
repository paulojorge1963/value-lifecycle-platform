import Link from "next/link";
import { VE_PHASES, VR_PHASES } from "@/lib/domain/phases";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-ink-200 bg-white p-8">
        <p className="label">Onboarding</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold text-ink-900">
          One platform for the full value lifecycle — from engineered value to proven value.
        </h1>
        <p className="mt-3 max-w-2xl text-ink-600">
          The <b>Value Engineer</b> analyses functions, cost and performance to build a quantified business case.
          The <b>Value Realization Manager</b> implements it, drives adoption, and proves the value against that
          business case. This platform connects the two — every realization track links back to its source study.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/ve" className="btn-ve">Enter Value Engineering →</Link>
          <Link href="/vr" className="btn-vr">Enter Value Realization →</Link>
          <Link href="/portfolio" className="btn-ghost">View Portfolio dashboard</Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card card-pad">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-ve-500" />
            <h2 className="font-semibold text-ink-900">The VE Job Plan — 8 phases</h2>
          </div>
          <ol className="mt-4 space-y-2">
            {VE_PHASES.map((p) => (
              <li key={p.key} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ve-50 text-xs font-bold text-ve-700">
                  {p.order}
                </span>
                <div>
                  <div className="font-medium text-ink-800">{p.title}</div>
                  <div className="text-xs text-ink-500">{p.purpose}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="card card-pad">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-vr-500" />
            <h2 className="font-semibold text-ink-900">The Value Realization lifecycle — 7 phases</h2>
          </div>
          <ol className="mt-4 space-y-2">
            {VR_PHASES.map((p) => (
              <li key={p.key} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-vr-50 text-xs font-bold text-vr-700">
                  {p.order}
                </span>
                <div>
                  <div className="font-medium text-ink-800">{p.title}</div>
                  <div className="text-xs text-ink-500">{p.purpose}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-ink-300 bg-white p-6">
        <h3 className="font-semibold text-ink-900">How the two roles connect</h3>
        <div className="mt-4 flex flex-col items-stretch gap-3 text-sm md:flex-row md:items-center">
          <div className="flex-1 rounded-xl bg-ve-50 p-4">
            <div className="label text-ve-700">Value Engineer</div>
            <p className="mt-1 text-ink-700">Runs the study → produces recommendations + business case → defines baselines, KPIs & success criteria.</p>
          </div>
          <div className="grid place-items-center px-2 text-2xl text-ink-400">→</div>
          <div className="flex-1 rounded-xl bg-vr-50 p-4">
            <div className="label text-vr-700">Value Realization Manager</div>
            <p className="mt-1 text-ink-700">Receives the handover → implements & drives adoption → measures realized vs planned value → reports & closes the loop.</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-500">
          Use the role switcher (top-right) to experience the platform as a Value Engineer, Value Realization Manager,
          Reviewer or Stakeholder.
        </p>
      </section>
    </div>
  );
}
