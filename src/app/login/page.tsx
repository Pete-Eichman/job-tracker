import { LoginForm } from "./LoginForm";
import { githubLogin } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center text-fg">Sign in</h1>

        <LoginForm />

        <div className="text-center text-sm text-fg-subtle">or</div>

        <form action={githubLogin}>
          <SubmitButton
            className="w-full py-2 border border-border rounded-lg text-fg font-medium hover:bg-surface-2 transition-colors duration-150 disabled:opacity-50"
            pendingLabel="Redirecting…"
          >
            Sign in with GitHub
          </SubmitButton>
        </form>

        <p className="text-sm text-center text-fg-subtle">
          No account?{" "}
          <a href="/register" className="underline text-fg hover:text-accent transition-colors duration-150">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
