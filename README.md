    # Job Tracker

    Job Tracker reads job postings for you, tells you honestly how well you fit, helps you write
    the application, and keeps a record of every AI call it makes. Paste a posting URL and Claude
    extracts the structured fields. Your resume is scored against the role with a match percentage
    and an honest breakdown of the gaps. A tailored cover letter is drafted from there. It is a
    single-user tool I built for my own job search and as a portfolio piece, so the design leans
    toward honesty and inspectability over polish.

    What separates it from a wrapper around a chat prompt is the scoring philosophy. Gaps are
    classified three ways: vocabulary (you have it, your resume does not say it), closable (a
    weekend of work), and hard (a credential or years you do not have). Nothing is fabricated and
    nothing is flattered, and every gap comes with a concrete action. A high score you cannot
    trust is worse than a low score you can.

    Under the surface, every model call is instrumented for tokens, cost, and latency and stored
    in a transactional ScoringRun record, so what the AI does and what it costs stays visible
    rather than hidden. Scoring quality is measured by an offline eval harness with a composite
    rubric and labeled fixtures. The first live baseline ran at a Spearman of 0.895 against
    hand-labeled tiers. Business logic lives in a dedicated services layer, kept out of route
    handlers and server actions.

    **Stack:** Next.js 16 (App Router), TypeScript, Prisma + Neon Postgres, Auth.js v5, Vercel AI
    SDK with Anthropic, Zod, Tailwind. Deployed on Vercel.

    Two docs go deeper:

    - **[DECISIONS.md](./DECISIONS.md):** the non-obvious engineering choices and what each one
    traded away. Written for a technical reviewer.
    - **[HOW-IT-WORKS.md](./HOW-IT-WORKS.md):** a plain-language walkthrough for anyone who wants
    to understand the app without reading code.


    ## Required environment variables

    ```
    DATABASE_URL=          # PostgreSQL connection string
    AUTH_SECRET=           # NextAuth secret (generate with: openssl rand -base64 32)
    ANTHROPIC_API_KEY=     # Anthropic API key
    AUTH_GITHUB_ID=        # GitHub OAuth app client ID (optional)
    AUTH_GITHUB_SECRET=    # GitHub OAuth app client secret (optional)
    ```

    ## Development

    ```bash
    pnpm install
    pnpm exec prisma migrate dev   # apply migrations + generate client
    pnpm dev                        # start dev server at http://localhost:3000
    ```

    ## Testing & linting

    ```bash
    pnpm test        # run Vitest unit tests
    pnpm lint        # ESLint
    pnpm exec tsc --noEmit  # type-check
    ```

    ## Build & deploy

    ```bash
    pnpm build   # next build; runs prisma migrate deploy first only when VERCEL_ENV=production
    ```

Deployed on Vercel. On production deploys the build script runs migrations automatically before building. Preview and local builds run next build alone.
