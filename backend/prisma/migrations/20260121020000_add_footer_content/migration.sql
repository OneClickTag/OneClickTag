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

-- Insert default footer content
INSERT INTO "footer_content" ("id", "brandName", "brandDescription", "socialLinks", "sections", "copyrightText", "isActive", "updatedAt")
VALUES (
    'default',
    'OneClickTag',
    'Simplify your conversion tracking with automated GTM and Google Ads integration.',
    '[{"platform":"Twitter","url":"https://twitter.com/oneclicktag","icon":"twitter"},{"platform":"LinkedIn","url":"https://linkedin.com/company/oneclicktag","icon":"linkedin"},{"platform":"GitHub","url":"https://github.com/oneclicktag","icon":"github"}]'::jsonb,
    '[{"title":"Product","links":[{"label":"Pricing","url":"/plans"}]},{"title":"Company","links":[{"label":"About Us","url":"/about"},{"label":"Contact","url":"/contact"}]},{"title":"Legal","links":[{"label":"Terms of Service","url":"/terms"},{"label":"Privacy Policy","url":"/privacy"}]}]'::jsonb,
    'OneClickTag. All rights reserved.',
    true,
    CURRENT_TIMESTAMP
);
