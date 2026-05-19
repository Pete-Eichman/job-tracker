-- CreateIndex
CREATE INDEX "Resume_userId_idx" ON "Resume"("userId");

-- CreateIndex
CREATE INDEX "Job_userId_archivedAt_idx" ON "Job"("userId", "archivedAt");
