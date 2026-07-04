# L-1 / L-2 — Login timing oracle and form accessibility

## L-1: User enumeration via login response timing

**The problem.** `authorize()` in `src/lib/auth.ts` looked up the user first,
then only ran `bcrypt.compare()` if a matching account with a password hash
existed. bcrypt is deliberately slow (cost factor 12 takes tens of
milliseconds); skipping it entirely on the "no such user" path made that path
measurably faster than a real account with a wrong password. An attacker
timing responses could use that gap to enumerate registered emails without
ever seeing a different error message.

**The fix.** Always run `bcrypt.compare()`, regardless of whether the user
exists: compare against the user's real hash if they have one, or a fixed
`DUMMY_PASSWORD_HASH` (a genuinely valid bcrypt hash, cost 12, no real
corresponding plaintext) if they don't. Both paths now pay the same
cost-factor work before returning `null`. The login action's error message was
already generic ("Invalid email or password.") — that didn't need to change,
only the timing behavior underneath it.

**Not fixed here — register enumeration (documented tradeoff).** `register()`
still returns "An account with that email already exists" for a duplicate
signup, which is a *content*-based (not timing-based) enumeration oracle.
Closing that properly needs an email-verification flow: create the account
unconfirmed, show the same "check your email" response regardless of whether
the email was new or a duplicate, and only activate on verification. That's a
real feature addition (email sending, a verification token/table, a confirm
route), not a small fix, and was judged out of scope for this pass — a
half-measure here (e.g., a vague error) would degrade real users' signup
experience while a determined attacker could still infer the same signal
elsewhere (e.g., the password-reset flow, if one exists). Flagging honestly as
a known, accepted limitation rather than silently leaving it unmentioned.

## L-2: Login/register inputs had no accessible label

**The problem.** Both `LoginForm.tsx` and `RegisterForm.tsx` relied solely on
`placeholder` text for each field's name. Placeholders disappear on focus and
aren't a reliable accessible name for screen readers (not all screen
reader/browser combinations expose placeholder text as the field's label).

**The fix.** Added an `id` to each input and an associated `<label htmlFor>`
using Tailwind's `sr-only` utility (visually hidden, still in the accessibility
tree) — the visible placeholder text is unchanged.

## Verification

- Full suite passing, clean `tsc`/`eslint`/`next build`.
- No automated test for the timing fix itself (timing-based assertions are
  inherently flaky in CI); verified by reading the control flow directly —
  both the "user exists, wrong password" and "user doesn't exist" branches
  now execute the same `bcrypt.compare()` call before returning `null`.
- Confirmed login still succeeds for a real user with the correct password
  and still rejects a wrong password / nonexistent email, via the existing
  `authorize()` logic path (structurally unchanged aside from moving the
  bcrypt call earlier and always executing it).
