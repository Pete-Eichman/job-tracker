"use client";

import { useActionState } from "react";
import { register, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState);

  return (
    <form action={formAction} className="space-y-3">
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
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="w-full py-2 bg-foreground text-background rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
