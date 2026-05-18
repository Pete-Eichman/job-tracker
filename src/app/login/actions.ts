"use server";

import { z } from "zod";
import { signIn } from "@/lib/auth";
import { parseFormData } from "@/lib/forms";
import { unstable_rethrow } from "next/navigation";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginState = { error?: string };

export async function credentialsLogin(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  let parsed;
  try {
    parsed = parseFormData(formData, LoginSchema);
  } catch {
    return { error: "Enter a valid email and password." };
  }

  try {
    await signIn("credentials", {
      email: parsed.email,
      password: parsed.password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    unstable_rethrow(error);
    return { error: "Invalid email or password." };
  }
}

export async function githubLogin(): Promise<void> {
  await signIn("github", { redirectTo: "/dashboard" });
}
