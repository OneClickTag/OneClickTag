import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LeadsService } from '../services/leads.service';
import { QuestionnaireService } from '../services/questionnaire.service';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { SubmitQuestionnaireDto } from '../dto/submit-questionnaire.dto';
import { CreatePageViewDto } from '../dto/page-view.dto';

@ApiTags('Leads - Public')
@Controller('v1/leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly questionnaireService: QuestionnaireService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new lead (early access signup)' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @Post(':id/responses')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit questionnaire responses' })
  @ApiResponse({ status: 200, description: 'Questionnaire submitted successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 400, description: 'Questionnaire already completed' })
  submitQuestionnaire(
    @Param('id') id: string,
    @Body() submitDto: SubmitQuestionnaireDto,
  ) {
    return this.leadsService.submitQuestionnaire(id, submitDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID with responses' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Post('page-views')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Track page view (analytics)' })
  @ApiResponse({ status: 201, description: 'Page view tracked' })
  trackPageView(@Body() createPageViewDto: CreatePageViewDto) {
    return this.leadsService.createPageView(createPageViewDto);
  }
}

@ApiTags('Questionnaire - Public')
@Controller('v1/questionnaire')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Get('questions')
  @ApiOperation({ summary: 'Get active questionnaire questions' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  getActiveQuestions() {
    return this.questionnaireService.getActiveQuestions();
  }
}
