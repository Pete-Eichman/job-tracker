import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default function LoginPage() {
  async function credentialsLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/dashboard",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        throw error;
      }
      redirect("/login?error=invalid");
    }
  }

  async function githubLogin() {
    "use server";
    await signIn("github", { redirectTo: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center">Sign in</h1>

        <form action={credentialsLogin} className="space-y-3">
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
            placeholder="Password"
            required
            className="w-full px-3 py-2 border rounded-md bg-transparent"
          />
          <button
            type="submit"
            className="w-full py-2 bg-foreground text-background rounded-md font-medium"
          >
            Sign in with email
          </button>
        </form>

        <div className="text-center text-sm text-gray-500">or</div>

        <form action={githubLogin}>
          <button
            type="submit"
            className="w-full py-2 border rounded-md font-medium"
          >
            Sign in with GitHub
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          No account?{" "}
          <a href="/register" className="underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}