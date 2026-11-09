import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { PasswordChangeForm } from "@/components/PasswordChangeForm";

export const metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-ink-900">Change password</h1>
      <p className="mt-1 text-sm text-ink-500">
        Update the password for <span className="font-medium text-ink-700">{user.email}</span>.
      </p>
      <div className="card card-pad mt-6">
        <PasswordChangeForm />
      </div>
    </div>
  );
}
