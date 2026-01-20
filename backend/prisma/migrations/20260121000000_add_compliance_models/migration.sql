-- CreateEnum for Cookie Consent Categories
CREATE TYPE "CookieConsentCategory" AS ENUM ('NECESSARY', 'ANALYTICS', 'MARKETING');

-- CreateEnum for Data Request Types
CREATE TYPE "DataRequestType" AS ENUM ('ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION', 'OBJECTION', 'CCPA_DELETE', 'CCPA_ACCESS');

-- CreateEnum for Request Status
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateTable: ComplianceSettings
CREATE TABLE "compliance_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "companyPhone" TEXT,
    "companyEmail" TEXT NOT NULL,
    "dpoName" TEXT,
    "dpoEmail" TEXT,
    "dpoPhone" TEXT,
    "ccpaTollFreeNumber" TEXT,
    "apiContactEmail" TEXT,
    "privacyContactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "compliance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CookieCategory
CREATE TABLE "cookie_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "CookieConsentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cookie_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Cookie
CREATE TABLE "cookies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HTTP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cookies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CookieConsentBanner
CREATE TABLE "cookie_consent_banners" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "headingText" TEXT NOT NULL DEFAULT 'We value your privacy',
    "bodyText" TEXT NOT NULL DEFAULT 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking ''Accept All'', you consent to our use of cookies.',
    "acceptAllButtonText" TEXT NOT NULL DEFAULT 'Accept All',
    "rejectAllButtonText" TEXT NOT NULL DEFAULT 'Reject All',
    "customizeButtonText" TEXT NOT NULL DEFAULT 'Customize',
    "savePreferencesText" TEXT NOT NULL DEFAULT 'Save Preferences',
    "position" TEXT NOT NULL DEFAULT 'bottom',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#000000',
    "acceptButtonColor" TEXT NOT NULL DEFAULT '#10b981',
    "rejectButtonColor" TEXT NOT NULL DEFAULT '#ef4444',
    "customizeButtonColor" TEXT NOT NULL DEFAULT '#6b7280',
    "consentExpiryDays" INTEGER NOT NULL DEFAULT 365,
    "showOnEveryPage" BOOLEAN NOT NULL DEFAULT true,
    "blockCookiesUntilConsent" BOOLEAN NOT NULL DEFAULT true,
    "privacyPolicyUrl" TEXT NOT NULL DEFAULT '/privacy',
    "cookiePolicyUrl" TEXT NOT NULL DEFAULT '/cookie-policy',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cookie_consent_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserCookieConsent
CREATE TABLE "user_cookie_consents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "necessaryCookies" BOOLEAN NOT NULL DEFAULT true,
    "analyticsCookies" BOOLEAN NOT NULL DEFAULT false,
    "marketingCookies" BOOLEAN NOT NULL DEFAULT false,
    "consentGivenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentExpiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_cookie_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DataAccessRequest
CREATE TABLE "data_access_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "requestType" "DataRequestType" NOT NULL,
    "email" TEXT NOT NULL,
    "description" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "responseMessage" TEXT,
    "dataExportUrl" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ApiAuditLog
CREATE TABLE "api_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "customerId" TEXT,
    "apiService" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "httpMethod" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SubProcessor
CREATE TABLE "sub_processors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "dataShared" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "dpaUrl" TEXT,
    "privacyPolicyUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_processors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PrivacyPolicySection
CREATE TABLE "privacy_policy_sections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_policy_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_settings_tenantId_idx" ON "compliance_settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_settings_tenantId_key" ON "compliance_settings"("tenantId");

-- CreateIndex
CREATE INDEX "cookie_categories_tenantId_idx" ON "cookie_categories"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "cookie_categories_tenantId_category_key" ON "cookie_categories"("tenantId", "category");

-- CreateIndex
CREATE INDEX "cookies_tenantId_idx" ON "cookies"("tenantId");

-- CreateIndex
CREATE INDEX "cookies_categoryId_idx" ON "cookies"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "cookies_tenantId_name_key" ON "cookies"("tenantId", "name");

-- CreateIndex
CREATE INDEX "cookie_consent_banners_tenantId_idx" ON "cookie_consent_banners"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "cookie_consent_banners_tenantId_key" ON "cookie_consent_banners"("tenantId");

-- CreateIndex
CREATE INDEX "user_cookie_consents_tenantId_idx" ON "user_cookie_consents"("tenantId");

-- CreateIndex
CREATE INDEX "user_cookie_consents_userId_idx" ON "user_cookie_consents"("userId");

-- CreateIndex
CREATE INDEX "user_cookie_consents_anonymousId_idx" ON "user_cookie_consents"("anonymousId");

-- CreateIndex
CREATE INDEX "data_access_requests_tenantId_idx" ON "data_access_requests"("tenantId");

-- CreateIndex
CREATE INDEX "data_access_requests_userId_idx" ON "data_access_requests"("userId");

-- CreateIndex
CREATE INDEX "data_access_requests_email_idx" ON "data_access_requests"("email");

-- CreateIndex
CREATE INDEX "data_access_requests_status_idx" ON "data_access_requests"("status");

-- CreateIndex
CREATE INDEX "api_audit_logs_tenantId_idx" ON "api_audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "api_audit_logs_userId_idx" ON "api_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "api_audit_logs_customerId_idx" ON "api_audit_logs"("customerId");

-- CreateIndex
CREATE INDEX "api_audit_logs_apiService_idx" ON "api_audit_logs"("apiService");

-- CreateIndex
CREATE INDEX "api_audit_logs_createdAt_idx" ON "api_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "sub_processors_tenantId_idx" ON "sub_processors"("tenantId");

-- CreateIndex
CREATE INDEX "privacy_policy_sections_tenantId_idx" ON "privacy_policy_sections"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_policy_sections_tenantId_key_key" ON "privacy_policy_sections"("tenantId", "key");

-- AddForeignKey
ALTER TABLE "compliance_settings" ADD CONSTRAINT "compliance_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cookie_categories" ADD CONSTRAINT "cookie_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cookies" ADD CONSTRAINT "cookies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cookies" ADD CONSTRAINT "cookies_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "cookie_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cookie_consent_banners" ADD CONSTRAINT "cookie_consent_banners_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cookie_consents" ADD CONSTRAINT "user_cookie_consents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cookie_consents" ADD CONSTRAINT "user_cookie_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_requests" ADD CONSTRAINT "data_access_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_requests" ADD CONSTRAINT "data_access_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_requests" ADD CONSTRAINT "data_access_requests_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_audit_logs" ADD CONSTRAINT "api_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_audit_logs" ADD CONSTRAINT "api_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_audit_logs" ADD CONSTRAINT "api_audit_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_processors" ADD CONSTRAINT "sub_processors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_policy_sections" ADD CONSTRAINT "privacy_policy_sections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
