"use client";

import { useActionState } from "react";
import { credentialsLogin, type LoginState } from "./actions";

const initialState: LoginState = {};

const inputClass =
  "w-full px-3 py-2 bg-surface border border-border text-fg placeholder:text-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none transition-[border-color,box-shadow] duration-150 rounded-lg text-sm";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    credentialsLogin,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        className={inputClass}
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        required
        className={inputClass}
      />
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-fg-muted"
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="w-full py-2 bg-accent text-accent-fg rounded-lg font-medium hover:bg-accent/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Signing in…" : "Sign in with email"}
      </button>
    </form>
  );
}
