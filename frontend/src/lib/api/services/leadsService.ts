/**
 * Leads API Service
 * Handles public lead submission and questionnaire endpoints
 */

import axios, { AxiosInstance } from 'axios';
import { getBaseURL, apiEndpoints } from '../config';

// Create axios instance for public leads endpoints (no auth required)
const publicApi: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Lead {
  id: string;
  name: string;
  email: string;
  purpose: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  questionnaireCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadData {
  name: string;
  email: string;
  purpose: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface QuestionnaireResponse {
  questionId: string;
  answer: any;
}

export interface SubmitQuestionnaireData {
  responses: QuestionnaireResponse[];
}

export interface PageViewData {
  leadId?: string;
  sessionId: string;
  path: string;
  referrer?: string;
}

export const leadsService = {
  /**
   * Create a new lead (early access signup)
   */
  async create(data: CreateLeadData): Promise<Lead> {
    const response = await publicApi.post<Lead>(apiEndpoints.leads.create, data);
    return response.data;
  },

  /**
   * Get lead by ID
   */
  async getById(id: string): Promise<Lead> {
    const response = await publicApi.get<Lead>(apiEndpoints.leads.get(id));
    return response.data;
  },

  /**
   * Submit questionnaire responses
   */
  async submitQuestionnaire(leadId: string, data: SubmitQuestionnaireData): Promise<Lead> {
    const response = await publicApi.post<Lead>(
      apiEndpoints.leads.submitQuestionnaire(leadId),
      data
    );
    return response.data;
  },

  /**
   * Track page view for analytics
   */
  async trackPageView(data: PageViewData): Promise<void> {
    await publicApi.post(apiEndpoints.leads.trackPageView, data);
  },
};
