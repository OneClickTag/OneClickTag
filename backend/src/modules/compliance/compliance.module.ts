import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EncryptionService } from '../../common/security/encryption.service';

// Controllers
import {
  ComplianceSettingsController,
  CookieCategoriesController,
  CookiesController,
  CookieConsentAdminController,
  CookieConsentPublicController,
  DataRequestsController,
  ApiAuditController,
} from './controllers';

// Services
import {
  ComplianceSettingsService,
  CookieManagementService,
  CookieConsentService,
  DataRequestService,
  ApiAuditService,
} from './services';

@Module({
  imports: [PrismaModule],
  controllers: [
    ComplianceSettingsController,
    CookieCategoriesController,
    CookiesController,
    CookieConsentAdminController,
    CookieConsentPublicController,
    DataRequestsController,
    ApiAuditController,
  ],
  providers: [
    ComplianceSettingsService,
    CookieManagementService,
    CookieConsentService,
    DataRequestService,
    ApiAuditService,
    EncryptionService,
  ],
  exports: [
    ComplianceSettingsService,
    CookieManagementService,
    CookieConsentService,
    DataRequestService,
    ApiAuditService,
    EncryptionService,
  ],
})
export class ComplianceModule {}
