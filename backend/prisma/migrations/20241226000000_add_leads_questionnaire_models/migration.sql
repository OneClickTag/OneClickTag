-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'TEXTAREA', 'RADIO', 'CHECKBOX', 'RATING', 'SCALE');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "questionnaireCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'TEXT',
    "options" JSONB,
    "placeholder" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "questionnaire_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_responses" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_page_views" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_page_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "leads_questionnaireCompleted_idx" ON "leads"("questionnaireCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_key" ON "leads"("email");

-- CreateIndex
CREATE INDEX "questionnaire_questions_isActive_order_idx" ON "questionnaire_questions"("isActive", "order");

-- CreateIndex
CREATE INDEX "questionnaire_responses_leadId_idx" ON "questionnaire_responses"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_responses_leadId_questionId_key" ON "questionnaire_responses"("leadId", "questionId");

-- CreateIndex
CREATE INDEX "lead_page_views_leadId_idx" ON "lead_page_views"("leadId");

-- CreateIndex
CREATE INDEX "lead_page_views_sessionId_idx" ON "lead_page_views"("sessionId");

-- CreateIndex
CREATE INDEX "lead_page_views_createdAt_idx" ON "lead_page_views"("createdAt");

-- AddForeignKey
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questionnaire_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_page_views" ADD CONSTRAINT "lead_page_views_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
