import { Module } from '@nestjs/common';
import { PublicContentController } from './controllers/public-content.controller';
import { PublicPlansController } from './controllers/public-plans.controller';
import { PublicLandingController } from './controllers/public-landing.controller';
import { PublicSiteSettingsController } from './controllers/public-site-settings.controller';
import { PublicContactController } from './controllers/public-contact.controller';
import { PublicFooterController } from './controllers/public-footer.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [
    PublicContentController,
    PublicPlansController,
    PublicLandingController,
    PublicSiteSettingsController,
    PublicContactController,
    PublicFooterController,
  ],
})
export class PublicModule {}
