import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { LeadsController, QuestionnaireController } from './controllers/leads.controller';
import { AdminLeadsController, AdminQuestionnaireController, AdminEmailTemplateController } from './controllers/admin-leads.controller';
import { LeadsService } from './services/leads.service';
import { QuestionnaireService } from './services/questionnaire.service';
import { LeadAnalyticsService } from './services/lead-analytics.service';
import { EmailService } from './services/email.service';
import { EmailTemplateService } from './services/email-template.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    LeadsController,
    QuestionnaireController,
    AdminLeadsController,
    AdminQuestionnaireController,
    AdminEmailTemplateController,
  ],
  providers: [
    LeadsService,
    QuestionnaireService,
    LeadAnalyticsService,
    EmailService,
    EmailTemplateService,
  ],
  exports: [
    LeadsService,
    QuestionnaireService,
    LeadAnalyticsService,
    EmailService,
    EmailTemplateService,
  ],
})
export class LeadsModule implements OnModuleInit {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  async onModuleInit() {
    // Initialize default email templates on module startup
    await this.emailTemplateService.initializeDefaults();
  }
}
