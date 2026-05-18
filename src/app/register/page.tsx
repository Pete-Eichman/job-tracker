import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center">Create account</h1>

        <RegisterForm />

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
