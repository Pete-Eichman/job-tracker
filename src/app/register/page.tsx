import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";

export default function RegisterPage() {
  async function register(formData: FormData) {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password || password.length < 8) {
      redirect("/register?error=invalid");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      redirect("/register?error=exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, passwordHash },
    });

    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center">Create account</h1>

        <form action={register} className="space-y-3">
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="w-full px-3 py-2 border rounded-md bg-transparent"
          />
          <input
            type="password"
            name="password"
            placeholder="Password (min 8 chars)"
            required
            minLength={8}
            className="w-full px-3 py-2 border rounded-md bg-transparent"
          />
          <button
            type="submit"
            className="w-full py-2 bg-foreground text-background rounded-md font-medium"
          >
            Create account
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          Already have one?{" "}
          <a href="/login" className="underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}