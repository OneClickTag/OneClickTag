-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('BUTTON_CLICK', 'LINK_CLICK', 'PAGE_VIEW', 'ELEMENT_VISIBILITY', 'FORM_SUBMIT', 'FORM_START', 'FORM_ABANDON', 'ADD_TO_CART', 'REMOVE_FROM_CART', 'ADD_TO_WISHLIST', 'VIEW_CART', 'CHECKOUT_START', 'CHECKOUT_STEP', 'PURCHASE', 'PRODUCT_VIEW', 'PHONE_CALL_CLICK', 'EMAIL_CLICK', 'DOWNLOAD', 'DEMO_REQUEST', 'SIGNUP', 'SCROLL_DEPTH', 'TIME_ON_PAGE', 'VIDEO_PLAY', 'VIDEO_COMPLETE', 'SITE_SEARCH', 'FILTER_USE', 'TAB_SWITCH', 'ACCORDION_EXPAND', 'MODAL_OPEN', 'SOCIAL_SHARE', 'SOCIAL_CLICK', 'PDF_DOWNLOAD', 'FILE_DOWNLOAD', 'NEWSLETTER_SIGNUP', 'CUSTOM_EVENT');

-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('PENDING', 'CREATING', 'ACTIVE', 'FAILED', 'PAUSED', 'SYNCING');

-- CreateEnum
CREATE TYPE "TrackingDestination" AS ENUM ('GA4', 'GOOGLE_ADS', 'BOTH');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "firebaseId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "tenantId" TEXT,
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
    "googleAccountId" TEXT,
    "googleEmail" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_firebaseId_key" ON "users"("firebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_userId_provider_scope_key" ON "oauth_tokens"("userId", "provider", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "customers_slug_key" ON "customers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_tenantId_key" ON "customers"("email", "tenantId");

-- CreateIndex
CREATE INDEX "customers_tenantId_status_idx" ON "customers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customers_tenantId_email_idx" ON "customers"("tenantId", "email");

-- CreateIndex
CREATE INDEX "customers_tenantId_firstName_lastName_idx" ON "customers"("tenantId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "customers_tenantId_company_idx" ON "customers"("tenantId", "company");

-- CreateIndex
CREATE UNIQUE INDEX "google_ads_accounts_accountId_tenantId_key" ON "google_ads_accounts"("accountId", "tenantId");

-- CreateIndex
CREATE INDEX "google_ads_accounts_tenantId_customerId_idx" ON "google_ads_accounts"("tenantId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ga4_properties_propertyId_tenantId_key" ON "ga4_properties"("propertyId", "tenantId");

-- CreateIndex
CREATE INDEX "ga4_properties_tenantId_customerId_idx" ON "ga4_properties"("tenantId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_aggregations_tenantId_aggregationType_dateRangeSta_key" ON "analytics_aggregations"("tenantId", "aggregationType", "dateRangeStart", "dateRangeEnd");

-- CreateIndex
CREATE INDEX "analytics_aggregations_tenantId_aggregationType_idx" ON "analytics_aggregations"("tenantId", "aggregationType");

-- CreateIndex
CREATE INDEX "analytics_aggregations_dateRangeStart_dateRangeEnd_idx" ON "analytics_aggregations"("dateRangeStart", "dateRangeEnd");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_googleCampaignId_tenantId_key" ON "campaigns"("googleCampaignId", "tenantId");

-- CreateIndex
CREATE INDEX "campaigns_tenantId_customerId_idx" ON "campaigns"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "campaigns_tenantId_status_idx" ON "campaigns"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conversion_actions_googleConversionActionId_tenantId_key" ON "conversion_actions"("googleConversionActionId", "tenantId");

-- CreateIndex
CREATE INDEX "conversion_actions_tenantId_customerId_idx" ON "conversion_actions"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "conversion_actions_tenantId_status_idx" ON "conversion_actions"("tenantId", "status");

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

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
