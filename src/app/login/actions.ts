"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function authenticate(
  _prev: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/portfolio",
    });
  } catch (error) {
    if (error instanceof AuthError) return "Invalid email or password.";
    throw error; // rethrow NEXT_REDIRECT so the redirect happens
  }
  return undefined;
}
