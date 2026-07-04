"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { parseFormData } from "@/lib/forms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { unstable_rethrow } from "next/navigation";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type RegisterState = { error?: string };

export async function register(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  let parsed;
  try {
    parsed = parseFormData(formData, RegisterSchema);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message ?? "Enter a valid email and password." };
    }
    return { error: "Enter a valid email and password." };
  }

  const rate = await enforceRateLimit("auth", await getClientIp());
  if (!rate.ok) {
    return { error: "Too many attempts. Please wait a moment and try again." };
  }

  // Known, accepted tradeoff: this reveals whether an email is already
  // registered (account enumeration on signup). Closing it properly needs an
  // email-verification flow (create the account unconfirmed, always show a
  // "check your email" response either way, only activate on verification)
  // -- out of scope here. UX clarity for a real user hitting a real
  // duplicate-account mistake was judged worth more than a half-measure that
  // would still leak the same signal through other means (e.g. password
  // reset). Login's enumeration oracle (timing) is fixed in src/lib/auth.ts.
  const existing = await prisma.user.findUnique({
    where: { email: parsed.email },
  });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);
  await prisma.user.create({
    data: { email: parsed.email, passwordHash },
  });

  try {
    await signIn("credentials", {
      email: parsed.email,
      password: parsed.password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    unstable_rethrow(error);
    return { error: "Account created, but sign-in failed. Try logging in." };
  }
}
