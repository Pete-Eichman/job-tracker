/**
 * Live eval for the match-explanation service. Calls the real Anthropic API
 * against known fixtures and checks that the model classifies gaps correctly.
 *
 * Run: pnpm eval:explanation
 * Requires: ANTHROPIC_API_KEY in environment (or .env file)
 *
 * NOT wired into CI — results are non-deterministic and cost real tokens.
 * Use this after changing the prompt in match-explanation.ts to spot-check
 * that model behavior hasn't regressed on the cases that matter most.
 */
import "dotenv/config";
import { explainMatch } from "@/lib/services/match-explanation";
import type { GapExplanation, MatchExplanation } from "@/lib/services/match-explanation";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Add it to your .env file.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fixtures = [
  {
    name: "F1 — Hard gap: active licensure (PE license)",
    description:
      "The posting requires a Professional Engineer license. The resume is a " +
      "recent grad with no PE. Expect: type=hard, hedge=false for the license requirement.",
    job: {
      title: "Structural Engineer",
      company: "BridgeCo Engineering",
      location: "Chicago, IL",
      workMode: "ONSITE" as const,
      seniority: "Mid-level",
      requiredSkills: ["Structural analysis", "AutoCAD", "Professional Engineer (PE) license"],
      niceToHaveSkills: ["STAAD.Pro", "Revit"],
      responsibilities: [
        "Stamp and seal structural drawings for public infrastructure projects",
        "Lead design reviews and site inspections",
        "Mentor junior engineers",
      ],
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
    },
    resume: {
      rawText: `Alex Kim — Structural Engineer
B.S. Civil Engineering, University of Illinois, 2022
EIT (Engineer in Training) certification — passed FE exam

Experience:
Junior Structural Engineer, Midwest Design Group (2022–present)
- Performed structural analysis using AutoCAD and hand calculations
- Assisted senior engineers on bridge rehabilitation projects
- Prepared construction documents under PE supervision

Skills: AutoCAD, structural analysis, ASCE 7, ACI 318, steel and concrete design`,
    },
    score: 52,
    checks: [
      {
        label: "PE license classified as hard",
        fn: (r: MatchExplanation) =>
          r.gaps.some(
            (g) =>
              /PE|professional engineer|license/i.test(g.requirement) &&
              g.type === "hard"
          ),
      },
      {
        label: "PE license NOT hedged",
        fn: (r: MatchExplanation) =>
          r.gaps
            .filter((g) => /PE|professional engineer|license/i.test(g.requirement))
            .every((g) => g.hedge === false),
      },
    ],
    fabricationCheck: true,
  },

  {
    name: "F2 — Degree-or-equivalent: should NOT be a hard barrier",
    description:
      "Posting says 'BS in CS or equivalent experience'. Resume has 8 years of " +
      "engineering experience but no degree. Expect: hedge=true, not classified hard.",
    job: {
      title: "Backend Software Engineer",
      company: "DataFlow Systems",
      location: "Remote",
      workMode: "REMOTE" as const,
      seniority: "Senior",
      requiredSkills: ["Python", "PostgreSQL", "REST API design"],
      niceToHaveSkills: ["Kafka", "Kubernetes"],
      responsibilities: [
        "Design and build data pipeline services",
        "Participate in architecture reviews",
        "Mentor junior engineers",
      ],
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
    },
    resume: {
      rawText: `Jordan Rivera — Software Engineer
No formal degree — self-taught and bootcamp (2016)

8 years of professional software engineering experience:

Senior Backend Engineer, StreamlineOps (2020–present)
- Designed REST APIs serving 2M+ daily requests in Python/FastAPI
- Owned PostgreSQL schema design and query optimization
- Led migration of monolith to microservices

Backend Engineer, Quickstart Inc. (2016–2020)
- Built internal tooling in Python; shipped 3 production services
- Worked with PostgreSQL daily; wrote migrations, optimized slow queries

Skills: Python, FastAPI, Django, PostgreSQL, Redis, Docker, REST API design`,
    },
    score: 78,
    checks: [
      {
        label: "Degree gap (if surfaced) is hedged",
        fn: (r: MatchExplanation) => {
          const degreeGaps = r.gaps.filter((g) =>
            /degree|BS|CS|education|bachelor/i.test(g.requirement)
          );
          // If no degree gap surfaced at all, that's also acceptable for a strong match
          return degreeGaps.length === 0 || degreeGaps.every((g) => g.hedge === true);
        },
      },
      {
        label: "Degree gap (if surfaced) NOT classified hard",
        fn: (r: MatchExplanation) => {
          const degreeGaps = r.gaps.filter((g) =>
            /degree|BS|CS|education|bachelor/i.test(g.requirement)
          );
          return degreeGaps.length === 0 || degreeGaps.every((g) => g.type !== "hard");
        },
      },
    ],
    fabricationCheck: false,
  },

  {
    name: "F3 — Modest experience gap: 5 years vs 7 requested",
    description:
      "Posting wants '7+ years backend experience'. Resume shows 5 years. " +
      "Expect: hedge=true (commonly accommodated), not treated as a hard wall.",
    job: {
      title: "Senior Backend Engineer",
      company: "Apex Platform",
      location: "New York, NY",
      workMode: "HYBRID" as const,
      seniority: "Senior",
      requiredSkills: ["Go", "Distributed systems", "gRPC"],
      niceToHaveSkills: ["Rust", "eBPF"],
      responsibilities: [
        "Build high-throughput data processing services",
        "7+ years of backend engineering experience required",
        "Design low-latency APIs using gRPC",
      ],
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
    },
    resume: {
      rawText: `Sam Chen — Backend Engineer
5 years of backend engineering experience

Backend Engineer, NovaTech (2021–present)
- Built gRPC services in Go handling 500K+ RPS
- Designed distributed caching layer reducing p99 latency by 40%
- Led incident response for core platform services

Software Engineer, LaunchPad (2019–2021)
- Rewrote legacy Python service in Go; 3x throughput improvement
- Implemented distributed tracing across 12 microservices

Skills: Go, gRPC, PostgreSQL, Redis, Kafka, Kubernetes, distributed systems`,
    },
    score: 74,
    checks: [
      {
        label: "Experience gap (if surfaced) is hedged",
        fn: (r: MatchExplanation) => {
          const expGaps = r.gaps.filter((g) =>
            /experience|years|seniority/i.test(g.requirement)
          );
          return expGaps.length === 0 || expGaps.every((g) => g.hedge === true);
        },
      },
      {
        label: "Experience gap (if surfaced) NOT classified hard",
        fn: (r: MatchExplanation) => {
          const expGaps = r.gaps.filter((g) =>
            /experience|years|seniority/i.test(g.requirement)
          );
          return expGaps.length === 0 || expGaps.every((g) => g.type !== "hard");
        },
      },
    ],
    fabricationCheck: false,
  },

  {
    name: "F4 — Vocabulary gap: REST APIs vs RESTful services",
    description:
      "Resume says 'REST APIs'; posting says 'RESTful services'. The substance is " +
      "identical — only wording differs. Expect: type=vocabulary with a specific rephrase.",
    job: {
      title: "API Platform Engineer",
      company: "ConnectLayer",
      location: "Austin, TX",
      workMode: "REMOTE" as const,
      seniority: "Mid-level",
      requiredSkills: [
        "RESTful services",
        "OpenAPI / Swagger",
        "Node.js",
        "TypeScript",
      ],
      niceToHaveSkills: ["GraphQL"],
      responsibilities: [
        "Design and maintain RESTful service contracts",
        "Write OpenAPI specifications",
        "Code review and API governance",
      ],
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
    },
    resume: {
      rawText: `Casey Okonkwo — Software Engineer
4 years building REST APIs and developer tooling

Software Engineer, DevKit Co (2021–present)
- Designed and shipped 8 REST APIs in Node.js/TypeScript used by 200+ enterprise clients
- Maintained Swagger/OpenAPI specs for all public endpoints
- Led API versioning strategy and deprecation process

Software Engineer, StartupHub (2020–2021)
- Built REST API backends in Express; integrated with third-party payment and auth APIs

Skills: Node.js, TypeScript, Express, REST APIs, OpenAPI, Swagger, PostgreSQL, Docker`,
    },
    score: 85,
    checks: [
      {
        label: "RESTful vocabulary gap classified as vocabulary (not closable/hard)",
        fn: (r: MatchExplanation) => {
          const restGaps = r.gaps.filter((g) =>
            /rest|restful/i.test(g.requirement)
          );
          // If no REST gap surfaced (strong match, minor wording), also acceptable
          return restGaps.length === 0 || restGaps.every((g) => g.type === "vocabulary");
        },
      },
      {
        label: "Vocabulary action contains a specific rephrase (not vague)",
        fn: (r: MatchExplanation) => {
          const vocabGaps = r.gaps.filter((g) => g.type === "vocabulary");
          // Each vocabulary action should mention the actual wording to use
          return (
            vocabGaps.length === 0 ||
            vocabGaps.every(
              (g) =>
                /RESTful|restful services/i.test(g.action) ||
                g.action.length > 30 // at minimum a substantive response
            )
          );
        },
      },
    ],
    fabricationCheck: false,
  },

  {
    name: "F5 — No fabrication: missing AWS cert",
    description:
      "Posting requires AWS Solutions Architect certification. Resume has no cloud certs. " +
      "Expect: action points to getting the cert — NOT suggesting adding fake AWS experience.",
    job: {
      title: "Cloud Infrastructure Engineer",
      company: "ScaleBase",
      location: "Remote",
      workMode: "REMOTE" as const,
      seniority: "Mid-level",
      requiredSkills: [
        "AWS Solutions Architect certification (Associate or Professional)",
        "Terraform",
        "Kubernetes",
        "CI/CD pipelines",
      ],
      niceToHaveSkills: ["CDK", "Pulumi"],
      responsibilities: [
        "Design and provision AWS infrastructure",
        "Build and maintain Terraform modules",
        "Manage Kubernetes clusters",
      ],
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
    },
    resume: {
      rawText: `Morgan Lee — DevOps Engineer
3 years in DevOps and platform engineering — no cloud certifications

DevOps Engineer, InternalTools Co (2022–present)
- Managed on-premise Kubernetes clusters (4 clusters, 60 nodes)
- Wrote Terraform for internal infrastructure (VMs, networking, storage)
- Built CI/CD pipelines in GitHub Actions for 15 services

DevOps Engineer, BuildFast (2021–2022)
- Maintained Jenkins-based CI/CD; migrated 3 pipelines to GitHub Actions
- Some AWS exposure (EC2, S3) but not the primary cloud operator

Skills: Kubernetes, Terraform, GitHub Actions, Docker, Linux, Bash`,
    },
    score: 61,
    checks: [
      {
        label: "AWS cert gap surfaced",
        fn: (r: MatchExplanation) =>
          r.gaps.some((g) => /AWS|cloud cert/i.test(g.requirement)),
      },
      {
        label: "No action tells user to fabricate/add/claim AWS experience",
        fn: (r: MatchExplanation) => {
          const fabricationPattern =
            /add (aws|cloud) (experience|expertise|skills?) (to your resume|in your)/i;
          return r.gaps.every((g) => !fabricationPattern.test(g.action));
        },
      },
      {
        label: "Action points toward earning the cert (not faking it)",
        fn: (r: MatchExplanation) => {
          const awsGaps = r.gaps.filter((g) => /AWS|cloud cert/i.test(g.requirement));
          return (
            awsGaps.length === 0 ||
            awsGaps.some((g) =>
              /cert|exam|study|course|associate|professional|aws training/i.test(g.action)
            )
          );
        },
      },
    ],
    fabricationCheck: true,
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const PASS = "\x1b[32m✓ PASS\x1b[0m";
const FAIL = "\x1b[31m✗ FAIL\x1b[0m";
const WARN = "\x1b[33m⚠ REVIEW\x1b[0m";

function printGap(gap: GapExplanation, index: number) {
  const typeColor =
    gap.type === "vocabulary"
      ? "\x1b[32m"
      : gap.type === "closable"
        ? "\x1b[33m"
        : "\x1b[31m";
  const reset = "\x1b[0m";
  console.log(
    `  [${index + 1}] ${typeColor}${gap.type.toUpperCase()}${reset}` +
      (gap.hedge ? " (hedged)" : "")
  );
  console.log(`      Requirement: ${gap.requirement}`);
  console.log(`      Finding:     ${gap.finding}`);
  console.log(`      Action:      ${gap.action}`);
}

async function runFixture(fixture: (typeof fixtures)[number]) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`FIXTURE: ${fixture.name}`);
  console.log(`${"=".repeat(70)}`);
  console.log(`Description: ${fixture.description}\n`);

  let result: MatchExplanation;
  try {
    const { result: r } = await explainMatch(fixture.job, fixture.resume, fixture.score);
    result = r;
  } catch (err) {
    console.error(`  ERROR calling explainMatch: ${err}`);
    return { passed: 0, failed: 1 };
  }

  console.log(`Overall note: ${result.overall_note}`);
  console.log(`\nGaps (${result.gaps.length}):`);
  if (result.gaps.length === 0) {
    console.log("  (none — model considers this a strong match)");
  } else {
    result.gaps.forEach(printGap);
  }

  let passed = 0;
  let failed = 0;

  console.log("\nChecks:");
  for (const check of fixture.checks) {
    const ok = check.fn(result);
    console.log(`  ${ok ? PASS : FAIL}  ${check.label}`);
    if (ok) passed++;
    else failed++;
  }

  if (fixture.fabricationCheck) {
    const allText = [
      result.overall_note,
      ...result.gaps.flatMap((g) => [g.finding, g.action]),
    ].join(" ");
    const fabricationPhrases = [
      /add.*experience.*resume/i,
      /claim.*experience/i,
      /mention.*you have/i,
      /list.*certification.*you don't/i,
    ];
    const flagged = fabricationPhrases.some((re) => re.test(allText));
    console.log(
      `  ${flagged ? FAIL : PASS}  No fabrication language detected (automated)`
    );
    console.log(
      `  ${WARN}  Manual review: read actions above and confirm none suggest ` +
        `implying credentials the resume doesn't support`
    );
    if (flagged) failed++;
    else passed++;
  }

  return { passed, failed };
}

async function main() {
  console.log("Match-Explanation Live Eval");
  console.log(`Model: claude-sonnet-4-6`);
  console.log(`Fixtures: ${fixtures.length}`);

  let totalPassed = 0;
  let totalFailed = 0;

  for (const fixture of fixtures) {
    const { passed, failed } = await runFixture(fixture);
    totalPassed += passed;
    totalFailed += failed;
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`RESULTS: ${totalPassed} passed, ${totalFailed} failed`);
  if (totalFailed > 0) {
    console.log(
      "\nSome automated checks failed — review the output above and " +
        "consider tightening the prompt in match-explanation.ts."
    );
    process.exit(1);
  } else {
    console.log("\nAll automated checks passed. Review ⚠ REVIEW items manually.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
