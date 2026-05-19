-- AlterTable
ALTER TABLE "AiUsage" ADD COLUMN "jobId" TEXT;

-- CreateIndex
CREATE INDEX "AiUsage_jobId_idx" ON "AiUsage"("jobId");

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
