import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center text-fg">Create account</h1>

        <RegisterForm />

        <p className="text-sm text-center text-fg-subtle">
          Already have one?{" "}
          <a href="/login" className="underline text-fg hover:text-accent transition-colors duration-150">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
