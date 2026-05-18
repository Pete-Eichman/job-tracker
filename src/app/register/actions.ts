"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { parseFormData } from "@/lib/forms";
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
