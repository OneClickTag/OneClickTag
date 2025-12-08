import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdminUsersController } from './controllers/admin-users.controller';
import { ContentPagesController } from './controllers/content-pages.controller';
import { PlansController } from './controllers/plans.controller';
import { LandingPageController } from './controllers/landing-page.controller';
import { SiteSettingsController } from './controllers/site-settings.controller';
import { ContactPageController } from './controllers/contact-page.controller';
import { AdminUsersService } from './services/admin-users.service';
import { ContentPagesService } from './services/content-pages.service';
import { PlansService } from './services/plans.service';
import { LandingPageService } from './services/landing-page.service';
import { SiteSettingsService } from './services/site-settings.service';
import { ContactPageService } from './services/contact-page.service';

@Module({
  controllers: [
    AdminUsersController,
    ContentPagesController,
    PlansController,
    LandingPageController,
    SiteSettingsController,
    ContactPageController,
  ],
  providers: [
    AdminUsersService,
    ContentPagesService,
    PlansService,
    LandingPageService,
    SiteSettingsService,
    ContactPageService,
    PrismaService,
  ],
  exports: [
    ContentPagesService,
    PlansService,
    LandingPageService,
    SiteSettingsService,
    ContactPageService,
  ],
})
export class AdminModule {}
