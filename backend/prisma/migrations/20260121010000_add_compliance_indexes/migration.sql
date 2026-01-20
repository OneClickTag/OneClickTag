-- Add performance indexes for compliance models

-- 1. Index on UserCookieConsent.consentExpiresAt for expiry checks
CREATE INDEX "user_cookie_consents_consentExpiresAt_idx" ON "user_cookie_consents"("consentExpiresAt");

-- 2. Composite index on DataAccessRequest (tenantId, status) for active requests
CREATE INDEX "data_access_requests_tenantId_status_idx" ON "data_access_requests"("tenantId", "status");

-- 3. Index on DataAccessRequest.dueDate for deadline tracking
CREATE INDEX "data_access_requests_dueDate_idx" ON "data_access_requests"("dueDate");

-- 4. Composite indexes on ApiAuditLog for time-range queries
CREATE INDEX "api_audit_logs_tenantId_createdAt_idx" ON "api_audit_logs"("tenantId", "createdAt");
CREATE INDEX "api_audit_logs_customerId_createdAt_idx" ON "api_audit_logs"("customerId", "createdAt");

-- 5. Unique constraint on PrivacyPolicySection (tenantId, order)
CREATE UNIQUE INDEX "privacy_policy_sections_tenantId_order_key" ON "privacy_policy_sections"("tenantId", "order");
