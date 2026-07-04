# L — Redirect swallowed by error handler

## The bug

Several server actions follow this pattern:

```ts
export async function someAction(_prev, formData) {
  try {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    // ...
  } catch (err) {
    return { error: err instanceof Error ? err.message : "..." };
  }
}
```

`redirect()` (from `next/navigation`) works by throwing a special
`NEXT_REDIRECT` error that Next's rendering layer catches further up the
stack and turns into an actual redirect. Here, the `catch` block sits between
the `throw` and Next's handler, so it intercepts the redirect error first —
and since it's just a plain `Error` as far as the catch is concerned, it gets
turned into `{ error: "NEXT_REDIRECT;replace;/login;..." }`. Instead of being
sent to the login page, the user sees that raw string rendered as a form
error. Same failure mode applies to `notFound()` calls, though none of these
actions use one today.

In practice this path is rarely hit — it only fires if a session expires
between the initial page load and the form submission — but it's a genuine
functional bug, not a style nit: the user gets a garbled error message
instead of a redirect to sign back in.

## The fix

`next/navigation` exports `unstable_rethrow(err)` specifically for this case:
it re-throws `err` if it's one of Next's internal control-flow errors
(redirect, notFound, etc.) and does nothing otherwise. Calling it as the
first line of each affected `catch` block lets those errors propagate to
Next's handler unchanged, while ordinary errors still fall through to the
existing `{ error: ... }` handling.

```ts
  } catch (err) {
    unstable_rethrow(err);
    return { error: err instanceof Error ? err.message : "..." };
  }
```

`src/app/login/actions.ts` already used this pattern; this change brings the
rest of the actions that redirect-inside-a-try in line with it.

## Files changed

- `src/app/actions/extract-job.ts`
- `src/app/actions/explain-match.ts`
- `src/app/actions/update-job.ts` (`updateStatusAction`, `updateJobAction`)
- `src/app/actions/archive-job.ts` (`toggleArchiveAction`, via the shared
  `setArchivedAt` helper)
- `src/app/actions/save-resume.ts` (`saveResume`, `setDefaultResume`)
- `src/app/actions/cover-letter.ts` (`deleteCoverLetterAction`)
- `src/app/actions/score-job.ts` (`rescoreJobAction` — defensive: `scoreJob()`
  re-checks the session itself and can redirect if it's somehow gone by the
  time it runs, even though this action already validated it above)

Five existing test files mocked `next/navigation` with only
`{ redirect: vi.fn() }`. Since production code now calls `unstable_rethrow`
unconditionally in every affected catch block, those mocks needed
`unstable_rethrow: vi.fn()` added alongside `redirect` (a no-op stub is
correct here — the tests don't exercise the redirect path, so it just needs
to exist and not throw):

- `src/app/actions/__tests__/score-job.test.ts`
- `src/app/actions/__tests__/set-default-resume.test.ts`
- `src/app/actions/__tests__/update-job.test.ts`
- `src/app/actions/__tests__/delete-cover-letter.test.ts`
- `src/app/actions/__tests__/archive-job.test.ts`

## Verification

Full suite, `tsc --noEmit`, ESLint, and `next build` all clean after the
mock updates above.
