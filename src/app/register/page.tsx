import { RegisterForm } from "@/components/RegisterForm";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-lg font-bold text-white">V</div>
        <h1 className="text-2xl font-bold text-ink-900">Create your workspace</h1>
        <p className="mt-1 text-sm text-ink-500">Set up a new value-engineering &amp; realization workspace.</p>
      </div>
      <div className="card card-pad">
        <RegisterForm />
      </div>
    </div>
  );
}
