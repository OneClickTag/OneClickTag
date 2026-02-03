import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailService } from './services/email.service';
import { EmailTemplateService } from './services/email-template.service';
import { AdminEmailTemplateController } from './controllers/admin-email-template.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminEmailTemplateController],
  providers: [EmailService, EmailTemplateService],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}
