import { PasswordChangeForm } from "@/components/PasswordChangeForm";

/**
 * Full-screen gate shown (in place of the whole app) when the signed-in user
 * still has an admin-set temporary password. Rendered by the root layout, so it
 * blocks every route until they set their own password; clearing the flag lets
 * the next render show the app normally.
 */
export function ForcedPasswordChange({ name }: { name: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-lg font-bold text-white">V</div>
        <h1 className="text-2xl font-bold text-ink-900">Set your password</h1>
        <p className="mt-1 text-sm text-ink-500">
          Welcome{name ? `, ${name.split(" ")[0]}` : ""}. Your account was set up with a temporary
          password — choose your own to continue.
        </p>
      </div>
      <div className="card card-pad">
        <PasswordChangeForm currentLabel="Temporary password" submitLabel="Set password & continue" />
      </div>
    </div>
  );
}
