-- CreateEnum
CREATE TYPE "ScoringRunStatus" AS ENUM ('SUCCESS', 'REPAIRED', 'FAILED');

-- CreateTable
CREATE TABLE "ScoringRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "resumeId" TEXT,
    "matchId" TEXT,
    "status" "ScoringRunStatus" NOT NULL,
    "sourceUrl" TEXT,
    "contentHash" TEXT,
    "extractedJob" JSONB,
    "score" INTEGER,
    "modelId" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL,
    "errorReason" TEXT,

    CONSTRAINT "ScoringRun_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScoringRun" ADD CONSTRAINT "ScoringRun_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringRun" ADD CONSTRAINT "ScoringRun_resumeId_fkey"
    FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringRun" ADD CONSTRAINT "ScoringRun_matchId_fkey"
    FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ScoringRun_userId_createdAt_idx" ON "ScoringRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ScoringRun_jobId_idx" ON "ScoringRun"("jobId");

-- CreateIndex
CREATE INDEX "ScoringRun_matchId_idx" ON "ScoringRun"("matchId");
