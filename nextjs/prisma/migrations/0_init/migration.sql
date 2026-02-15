-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('BUTTON_CLICK', 'LINK_CLICK', 'PAGE_VIEW', 'ELEMENT_VISIBILITY', 'FORM_SUBMIT', 'FORM_START', 'FORM_ABANDON', 'ADD_TO_CART', 'REMOVE_FROM_CART', 'ADD_TO_WISHLIST', 'VIEW_CART', 'CHECKOUT_START', 'CHECKOUT_STEP', 'PURCHASE', 'PRODUCT_VIEW', 'PHONE_CALL_CLICK', 'EMAIL_CLICK', 'DOWNLOAD', 'DEMO_REQUEST', 'SIGNUP', 'SCROLL_DEPTH', 'TIME_ON_PAGE', 'VIDEO_PLAY', 'VIDEO_COMPLETE', 'SITE_SEARCH', 'FILTER_USE', 'TAB_SWITCH', 'ACCORDION_EXPAND', 'MODAL_OPEN', 'SOCIAL_SHARE', 'SOCIAL_CLICK', 'PDF_DOWNLOAD', 'FILE_DOWNLOAD', 'NEWSLETTER_SIGNUP', 'CUSTOM_EVENT', 'RAGE_CLICK', 'DEAD_CLICK', 'TAB_VISIBILITY', 'SESSION_DURATION', 'EXIT_INTENT', 'TEXT_COPY', 'PAGE_PRINT', 'FORM_FIELD_INTERACTION', 'ERROR_PAGE_VIEW', 'RETURN_VISITOR', 'OUTBOUND_CLICK', 'PAGE_ENGAGEMENT', 'PRODUCT_IMAGE_INTERACTION', 'CART_ABANDONMENT', 'PRICE_COMPARISON', 'REVIEW_INTERACTION', 'CONTENT_READ_THROUGH');

-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('PENDING', 'CREATING', 'ACTIVE', 'FAILED', 'PAUSED', 'SYNCING');

-- CreateEnum
CREATE TYPE "TrackingDestination" AS ENUM ('GA4', 'GOOGLE_ADS', 'BOTH');

-- CreateEnum
CREATE TYPE "StapeContainerStatus" AS ENUM ('PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "StapeDomainStatus" AS ENUM ('PENDING', 'VALIDATED', 'FAILED');

-- CreateEnum
CREATE TYPE "TrackingMode" AS ENUM ('CLIENT_SIDE', 'SERVER_SIDE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'TEXTAREA', 'RADIO', 'CHECKBOX', 'RATING', 'SCALE');

-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('QUESTIONNAIRE_THANK_YOU', 'LEAD_WELCOME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EmailTriggerAction" AS ENUM ('LEAD_SIGNUP', 'QUESTIONNAIRE_COMPLETE');

-- CreateEnum
CREATE TYPE "CookieConsentCategory" AS ENUM ('NECESSARY', 'ANALYTICS', 'MARKETING');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION', 'OBJECTION', 'CCPA_DELETE', 'CCPA_ACCESS');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SiteScanStatus" AS ENUM ('QUEUED', 'DISCOVERING', 'CRAWLING', 'NICHE_DETECTED', 'AWAITING_CONFIRMATION', 'AWAITING_AUTH', 'DEEP_CRAWLING', 'ANALYZING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecommendationSeverity" AS ENUM ('CRITICAL', 'IMPORTANT', 'RECOMMENDED', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CREATED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "firebaseId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "tenantId" TEXT,
    "planId" TEXT,
    "planEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_tokens" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "tags" TEXT[],
    "notes" TEXT,
    "customFields" JSONB,
    "trackingSettings" JSONB,
    "websiteUrl" TEXT,
    "googleAccountId" TEXT,
    "googleEmail" TEXT,
    "gtmAccountId" TEXT,
    "gtmContainerId" TEXT,
    "gtmWorkspaceId" TEXT,
    "gtmContainerName" TEXT,
    "serverSideEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stape_containers" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "stapeContainerId" TEXT NOT NULL,
    "containerName" TEXT NOT NULL,
    "serverDomain" TEXT NOT NULL,
    "stapeDefaultDomain" TEXT NOT NULL,
    "status" "StapeContainerStatus" NOT NULL DEFAULT 'PENDING',
    "domainStatus" "StapeDomainStatus" NOT NULL DEFAULT 'PENDING',
    "gtmServerContainerId" TEXT,
    "gtmServerAccountId" TEXT,
    "gtmServerWorkspaceId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stape_containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_ads_accounts" (
    "id" TEXT NOT NULL,
    "googleAccountId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_ads_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ga4_properties" (
    "id" TEXT NOT NULL,
    "googleAccountId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "displayName" TEXT,
    "websiteUrl" TEXT,
    "timeZone" TEXT,
    "currency" TEXT,
    "industryCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "measurementId" TEXT,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ga4_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_aggregations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aggregationType" TEXT NOT NULL,
    "dateRangeStart" TIMESTAMP(3) NOT NULL,
    "dateRangeEnd" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "dimensions" JSONB NOT NULL,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processedCustomers" INTEGER NOT NULL DEFAULT 0,
    "processedAdsAccounts" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_aggregations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "budget" TEXT NOT NULL,
    "biddingStrategy" TEXT,
    "advertisingChannelType" TEXT,
    "googleCampaignId" TEXT,
    "googleAccountId" TEXT,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_actions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "category" TEXT,
    "valueSettings" JSONB,
    "googleConversionActionId" TEXT,
    "googleAccountId" TEXT,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "conversion_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trackings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TrackingType" NOT NULL,
    "description" TEXT,
    "status" "TrackingStatus" NOT NULL DEFAULT 'PENDING',
    "selector" TEXT,
    "urlPattern" TEXT,
    "selectorConfig" JSONB,
    "config" JSONB,
    "destinations" "TrackingDestination"[] DEFAULT ARRAY['GA4']::"TrackingDestination"[],
    "gtmTriggerId" TEXT,
    "gtmTagId" TEXT,
    "gtmTagIdGA4" TEXT,
    "gtmTagIdAds" TEXT,
    "gtmContainerId" TEXT,
    "gtmWorkspaceId" TEXT,
    "ga4EventName" TEXT,
    "ga4Parameters" JSONB,
    "ga4PropertyId" TEXT,
    "conversionActionId" TEXT,
    "adsConversionLabel" TEXT,
    "adsConversionValue" DECIMAL(10,2),
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isAutoCrawled" BOOLEAN NOT NULL DEFAULT false,
    "crawlMetadata" JSONB,
    "selectorConfidence" DOUBLE PRECISION,
    "trackingMode" "TrackingMode" NOT NULL DEFAULT 'CLIENT_SIDE',
    "sgtmTriggerId" TEXT,
    "sgtmTagId" TEXT,
    "sgtmTagIdAds" TEXT,
    "lastError" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "trackings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "features" JSONB NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "ctaText" TEXT NOT NULL DEFAULT 'Get Started',
    "ctaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_content" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "landing_page_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "brandName" TEXT,
    "brandColors" JSONB,
    "heroBackgroundUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "socialImageUrl" TEXT,
    "customCSS" TEXT,
    "customJS" TEXT,
    "seoSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_page_content" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "businessHours" TEXT,
    "socialLinks" JSONB,
    "faqs" JSONB,
    "formSettings" JSONB,
    "customContent" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "contact_page_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "footer_content" (
    "id" TEXT NOT NULL,
    "brandName" TEXT,
    "brandDescription" TEXT,
    "socialLinks" JSONB,
    "sections" JSONB,
    "copyrightText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "footer_content_pkey" PRIMARY KEY ("id")
);

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
    "acceptedTerms" BOOLEAN NOT NULL DEFAULT false,
    "acceptedTermsAt" TIMESTAMP(3),
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsentAt" TIMESTAMP(3),
    "questionnaireCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeReason" TEXT,
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

-- CreateTable
CREATE TABLE "email_triggers" (
    "id" TEXT NOT NULL,
    "action" "EmailTriggerAction" NOT NULL,
    "templateType" "EmailTemplateType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "email_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "type" "EmailTemplateType" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "availableVariables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "templateType" "EmailTemplateType" NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "leadId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "site_credentials" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "loginUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_seo_settings" (
    "id" TEXT NOT NULL,
    "pageSlug" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "noFollow" BOOLEAN NOT NULL DEFAULT false,
    "structuredData" TEXT,
    "sitemapPriority" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "sitemapFreq" TEXT NOT NULL DEFAULT 'monthly',
    "excludeFromSitemap" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "page_seo_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_scans" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "SiteScanStatus" NOT NULL DEFAULT 'QUEUED',
    "websiteUrl" TEXT NOT NULL,
    "maxPages" INTEGER NOT NULL DEFAULT 50,
    "maxDepth" INTEGER NOT NULL DEFAULT 3,
    "detectedNiche" TEXT,
    "nicheConfidence" DOUBLE PRECISION,
    "nicheSignals" JSONB,
    "nicheSubCategory" TEXT,
    "confirmedNiche" TEXT,
    "detectedTechnologies" JSONB,
    "existingTracking" JSONB,
    "totalPagesScanned" INTEGER,
    "totalRecommendations" INTEGER,
    "trackingReadinessScore" INTEGER,
    "readinessNarrative" TEXT,
    "recommendationCounts" JSONB,
    "siteMap" JSONB,
    "liveDiscovery" JSONB,
    "totalUrlsFound" INTEGER NOT NULL DEFAULT 0,
    "urlQueue" JSONB,
    "crawledUrls" JSONB,
    "loginDetected" BOOLEAN NOT NULL DEFAULT false,
    "loginUrl" TEXT,
    "credentialId" TEXT,
    "jobId" TEXT,
    "errorMessage" TEXT,
    "aiAnalysisUsed" BOOLEAN NOT NULL DEFAULT false,
    "authenticatedPagesCount" INTEGER NOT NULL DEFAULT 0,
    "obstaclesDismissed" INTEGER NOT NULL DEFAULT 0,
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "sessionCookies" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_pages" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "pageType" TEXT,
    "hasForm" BOOLEAN NOT NULL DEFAULT false,
    "hasCTA" BOOLEAN NOT NULL DEFAULT false,
    "hasVideo" BOOLEAN NOT NULL DEFAULT false,
    "hasPhoneLink" BOOLEAN NOT NULL DEFAULT false,
    "hasEmailLink" BOOLEAN NOT NULL DEFAULT false,
    "hasDownloadLink" BOOLEAN NOT NULL DEFAULT false,
    "importanceScore" DOUBLE PRECISION,
    "metaTags" JSONB,
    "headings" JSONB,
    "contentSummary" TEXT,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "templateGroup" TEXT,
    "scrollableHeight" INTEGER,
    "interactiveElementCount" INTEGER,
    "obstaclesEncountered" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_recommendations" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trackingType" "TrackingType" NOT NULL,
    "severity" "RecommendationSeverity" NOT NULL DEFAULT 'RECOMMENDED',
    "severityReason" TEXT,
    "selector" TEXT,
    "selectorConfig" JSONB,
    "selectorConfidence" DOUBLE PRECISION,
    "urlPattern" TEXT,
    "pageUrl" TEXT,
    "funnelStage" TEXT,
    "elementContext" JSONB,
    "suggestedConfig" JSONB,
    "suggestedGA4EventName" TEXT,
    "suggestedDestinations" JSONB,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "trackingId" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "businessValue" TEXT,
    "implementationNotes" TEXT,
    "affectedRoutes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracking_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_firebaseId_key" ON "users"("firebaseId");

-- CreateIndex
CREATE INDEX "users_planId_idx" ON "users"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_userId_provider_scope_key" ON "oauth_tokens"("userId", "provider", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "customers_slug_key" ON "customers"("slug");

-- CreateIndex
CREATE INDEX "customers_tenantId_status_idx" ON "customers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customers_tenantId_email_idx" ON "customers"("tenantId", "email");

-- CreateIndex
CREATE INDEX "customers_tenantId_firstName_lastName_idx" ON "customers"("tenantId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "customers_tenantId_company_idx" ON "customers"("tenantId", "company");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_tenantId_key" ON "customers"("email", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "stape_containers_customerId_key" ON "stape_containers"("customerId");

-- CreateIndex
CREATE INDEX "stape_containers_tenantId_idx" ON "stape_containers"("tenantId");

-- CreateIndex
CREATE INDEX "stape_containers_customerId_idx" ON "stape_containers"("customerId");

-- CreateIndex
CREATE INDEX "google_ads_accounts_tenantId_customerId_idx" ON "google_ads_accounts"("tenantId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "google_ads_accounts_accountId_tenantId_key" ON "google_ads_accounts"("accountId", "tenantId");

-- CreateIndex
CREATE INDEX "ga4_properties_tenantId_customerId_idx" ON "ga4_properties"("tenantId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ga4_properties_propertyId_tenantId_key" ON "ga4_properties"("propertyId", "tenantId");

-- CreateIndex
CREATE INDEX "analytics_aggregations_tenantId_aggregationType_idx" ON "analytics_aggregations"("tenantId", "aggregationType");

-- CreateIndex
CREATE INDEX "analytics_aggregations_dateRangeStart_dateRangeEnd_idx" ON "analytics_aggregations"("dateRangeStart", "dateRangeEnd");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_aggregations_tenantId_aggregationType_dateRangeSt_key" ON "analytics_aggregations"("tenantId", "aggregationType", "dateRangeStart", "dateRangeEnd");

-- CreateIndex
CREATE INDEX "campaigns_tenantId_customerId_idx" ON "campaigns"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "campaigns_tenantId_status_idx" ON "campaigns"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_googleCampaignId_tenantId_key" ON "campaigns"("googleCampaignId", "tenantId");

-- CreateIndex
CREATE INDEX "conversion_actions_tenantId_customerId_idx" ON "conversion_actions"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "conversion_actions_tenantId_status_idx" ON "conversion_actions"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conversion_actions_googleConversionActionId_tenantId_key" ON "conversion_actions"("googleConversionActionId", "tenantId");

-- CreateIndex
CREATE INDEX "trackings_tenantId_customerId_idx" ON "trackings"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "trackings_tenantId_status_idx" ON "trackings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "trackings_customerId_status_idx" ON "trackings"("customerId", "status");

-- CreateIndex
CREATE INDEX "trackings_customerId_type_idx" ON "trackings"("customerId", "type");

-- CreateIndex
CREATE INDEX "trackings_isAutoCrawled_idx" ON "trackings"("isAutoCrawled");

-- CreateIndex
CREATE UNIQUE INDEX "content_pages_slug_key" ON "content_pages"("slug");

-- CreateIndex
CREATE INDEX "content_pages_slug_idx" ON "content_pages"("slug");

-- CreateIndex
CREATE INDEX "content_pages_isPublished_idx" ON "content_pages"("isPublished");

-- CreateIndex
CREATE INDEX "plans_isActive_idx" ON "plans"("isActive");

-- CreateIndex
CREATE INDEX "plans_order_idx" ON "plans"("order");

-- CreateIndex
CREATE UNIQUE INDEX "landing_page_content_key_key" ON "landing_page_content"("key");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "leads_questionnaireCompleted_idx" ON "leads"("questionnaireCompleted");

-- CreateIndex
CREATE INDEX "leads_acceptedTerms_idx" ON "leads"("acceptedTerms");

-- CreateIndex
CREATE INDEX "leads_unsubscribed_idx" ON "leads"("unsubscribed");

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

-- CreateIndex
CREATE UNIQUE INDEX "email_triggers_action_key" ON "email_triggers"("action");

-- CreateIndex
CREATE INDEX "email_triggers_action_idx" ON "email_triggers"("action");

-- CreateIndex
CREATE INDEX "email_triggers_isActive_idx" ON "email_triggers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_type_key" ON "email_templates"("type");

-- CreateIndex
CREATE INDEX "email_templates_type_idx" ON "email_templates"("type");

-- CreateIndex
CREATE INDEX "email_templates_isActive_idx" ON "email_templates"("isActive");

-- CreateIndex
CREATE INDEX "email_logs_recipientEmail_idx" ON "email_logs"("recipientEmail");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_leadId_idx" ON "email_logs"("leadId");

-- CreateIndex
CREATE INDEX "email_logs_createdAt_idx" ON "email_logs"("createdAt");

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
CREATE INDEX "user_cookie_consents_consentExpiresAt_idx" ON "user_cookie_consents"("consentExpiresAt");

-- CreateIndex
CREATE INDEX "data_access_requests_tenantId_idx" ON "data_access_requests"("tenantId");

-- CreateIndex
CREATE INDEX "data_access_requests_userId_idx" ON "data_access_requests"("userId");

-- CreateIndex
CREATE INDEX "data_access_requests_email_idx" ON "data_access_requests"("email");

-- CreateIndex
CREATE INDEX "data_access_requests_status_idx" ON "data_access_requests"("status");

-- CreateIndex
CREATE INDEX "data_access_requests_tenantId_status_idx" ON "data_access_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "data_access_requests_dueDate_idx" ON "data_access_requests"("dueDate");

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
CREATE INDEX "api_audit_logs_tenantId_createdAt_idx" ON "api_audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "api_audit_logs_customerId_createdAt_idx" ON "api_audit_logs"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "sub_processors_tenantId_idx" ON "sub_processors"("tenantId");

-- CreateIndex
CREATE INDEX "privacy_policy_sections_tenantId_idx" ON "privacy_policy_sections"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_policy_sections_tenantId_key_key" ON "privacy_policy_sections"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_policy_sections_tenantId_order_key" ON "privacy_policy_sections"("tenantId", "order");

-- CreateIndex
CREATE INDEX "site_credentials_tenantId_idx" ON "site_credentials"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "site_credentials_customerId_domain_tenantId_key" ON "site_credentials"("customerId", "domain", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "page_seo_settings_pageSlug_key" ON "page_seo_settings"("pageSlug");

-- CreateIndex
CREATE INDEX "page_seo_settings_pageSlug_idx" ON "page_seo_settings"("pageSlug");

-- CreateIndex
CREATE INDEX "page_seo_settings_excludeFromSitemap_idx" ON "page_seo_settings"("excludeFromSitemap");

-- CreateIndex
CREATE INDEX "site_scans_tenantId_customerId_idx" ON "site_scans"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "site_scans_tenantId_status_idx" ON "site_scans"("tenantId", "status");

-- CreateIndex
CREATE INDEX "site_scans_customerId_createdAt_idx" ON "site_scans"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "scan_pages_scanId_idx" ON "scan_pages"("scanId");

-- CreateIndex
CREATE INDEX "scan_pages_scanId_pageType_idx" ON "scan_pages"("scanId", "pageType");

-- CreateIndex
CREATE INDEX "tracking_recommendations_scanId_idx" ON "tracking_recommendations"("scanId");

-- CreateIndex
CREATE INDEX "tracking_recommendations_scanId_severity_idx" ON "tracking_recommendations"("scanId", "severity");

-- CreateIndex
CREATE INDEX "tracking_recommendations_scanId_status_idx" ON "tracking_recommendations"("scanId", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stape_containers" ADD CONSTRAINT "stape_containers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_ads_accounts" ADD CONSTRAINT "google_ads_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ga4_properties" ADD CONSTRAINT "ga4_properties_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_actions" ADD CONSTRAINT "conversion_actions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trackings" ADD CONSTRAINT "trackings_conversionActionId_fkey" FOREIGN KEY ("conversionActionId") REFERENCES "conversion_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trackings" ADD CONSTRAINT "trackings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questionnaire_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_page_views" ADD CONSTRAINT "lead_page_views_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "site_credentials" ADD CONSTRAINT "site_credentials_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_scans" ADD CONSTRAINT "site_scans_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_pages" ADD CONSTRAINT "scan_pages_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "site_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_recommendations" ADD CONSTRAINT "tracking_recommendations_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "site_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

