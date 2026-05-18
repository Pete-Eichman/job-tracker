-- AlterTable
ALTER TABLE "CoverLetter" ADD COLUMN "resumeId" TEXT;

-- CreateIndex
CREATE INDEX "CoverLetter_resumeId_idx" ON "CoverLetter"("resumeId");

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
