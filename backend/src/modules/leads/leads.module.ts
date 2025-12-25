import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { LeadsController, QuestionnaireController } from './controllers/leads.controller';
import { AdminLeadsController, AdminQuestionnaireController } from './controllers/admin-leads.controller';
import { LeadsService } from './services/leads.service';
import { QuestionnaireService } from './services/questionnaire.service';
import { LeadAnalyticsService } from './services/lead-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    LeadsController,
    QuestionnaireController,
    AdminLeadsController,
    AdminQuestionnaireController,
  ],
  providers: [
    LeadsService,
    QuestionnaireService,
    LeadAnalyticsService,
  ],
  exports: [
    LeadsService,
    QuestionnaireService,
    LeadAnalyticsService,
  ],
})
export class LeadsModule {}
