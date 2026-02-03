import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminOnly } from '../../auth/decorators/roles.decorator';
import { LeadsService } from '../services/leads.service';
import { QuestionnaireService } from '../services/questionnaire.service';
import { LeadAnalyticsService } from '../services/lead-analytics.service';
import { EmailTemplateService, CreateEmailTemplateDto, UpdateEmailTemplateDto } from '../services/email-template.service';
import { LeadQueryDto } from '../dto/lead-query.dto';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { UpdateQuestionDto } from '../dto/update-question.dto';
import { EmailTemplateType } from '@prisma/client';

@ApiTags('Admin - Leads')
@Controller('v1/admin/leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
@ApiBearerAuth()
export class AdminLeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly analyticsService: LeadAnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all leads with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  findAll(@Query() query: LeadQueryDto) {
    return this.leadsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get lead statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats() {
    return this.analyticsService.getStats();
  }

  @Get('analytics/daily')
  @ApiOperation({ summary: 'Get daily lead counts' })
  @ApiResponse({ status: 200, description: 'Daily counts retrieved successfully' })
  getDailyCounts(@Query('days') days?: number) {
    return this.analyticsService.getDailyLeadCounts(days ? parseInt(days.toString()) : 30);
  }

  @Get('analytics/page-views')
  @ApiOperation({ summary: 'Get page view analytics' })
  @ApiResponse({ status: 200, description: 'Page view stats retrieved' })
  getPageViewStats(@Query('days') days?: number) {
    return this.analyticsService.getPageViewStats(days ? parseInt(days.toString()) : 7);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export leads to CSV' })
  @ApiResponse({ status: 200, description: 'Leads exported successfully' })
  exportLeads() {
    return this.analyticsService.exportLeads();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID with full details' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead' })
  @ApiResponse({ status: 200, description: 'Lead deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}

@ApiTags('Admin - Questionnaire')
@Controller('v1/admin/questionnaire/questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
@ApiBearerAuth()
export class AdminQuestionnaireController {
  constructor(
    private readonly questionnaireService: QuestionnaireService,
    private readonly analyticsService: LeadAnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all questions (including inactive)' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  findAll(@Query('activeOnly') activeOnly?: string) {
    const isActiveOnly = activeOnly === 'true';
    return this.questionnaireService.findAll(isActiveOnly);
  }

  @Post()
  @ApiOperation({ summary: 'Create new question' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionnaireService.create(createQuestionDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get question by ID' })
  @ApiResponse({ status: 200, description: 'Question retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  findOne(@Param('id') id: string) {
    return this.questionnaireService.findOne(id);
  }

  @Get(':id/responses')
  @ApiOperation({ summary: 'Get response distribution for a question' })
  @ApiResponse({ status: 200, description: 'Response distribution retrieved' })
  getQuestionResponses(@Param('id') id: string) {
    return this.analyticsService.getQuestionResponses(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update question' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
    return this.questionnaireService.update(id, updateQuestionDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle question active status' })
  @ApiResponse({ status: 200, description: 'Status toggled successfully' })
  toggleActive(@Param('id') id: string) {
    return this.questionnaireService.toggleActive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete question' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  remove(@Param('id') id: string) {
    return this.questionnaireService.remove(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder questions' })
  @ApiResponse({ status: 200, description: 'Questions reordered successfully' })
  reorder(@Body() body: { questionOrders: { id: string; order: number }[] }) {
    return this.questionnaireService.reorder(body.questionOrders);
  }

  @Get('stats/all')
  @ApiOperation({ summary: 'Get all response statistics for all questions' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  getAllResponseStats() {
    return this.analyticsService.getAllQuestionResponseStats();
  }
}

@ApiTags('Admin - Email Templates')
@Controller('v1/admin/email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
@ApiBearerAuth()
export class AdminEmailTemplateController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all email templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.emailTemplateService.findAll(activeOnly === 'true');
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available template types' })
  @ApiResponse({ status: 200, description: 'Types retrieved successfully' })
  getTypes() {
    return Object.values(EmailTemplateType).map((type) => ({
      value: type,
      label: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get email send logs' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('templateType') templateType?: EmailTemplateType,
    @Query('leadId') leadId?: string,
  ) {
    return this.emailTemplateService.getEmailLogs({
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
      status,
      templateType,
      leadId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  findOne(@Param('id') id: string) {
    return this.emailTemplateService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update email template' })
  @ApiResponse({ status: 201, description: 'Template saved successfully' })
  upsert(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplateService.upsert(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update email template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  update(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.emailTemplateService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle template active status' })
  @ApiResponse({ status: 200, description: 'Status toggled successfully' })
  toggleActive(@Param('id') id: string) {
    return this.emailTemplateService.toggleActive(id);
  }

  @Post('init-defaults')
  @ApiOperation({ summary: 'Initialize default templates' })
  @ApiResponse({ status: 200, description: 'Default templates initialized' })
  initDefaults() {
    return this.emailTemplateService.initializeDefaults();
  }
}
