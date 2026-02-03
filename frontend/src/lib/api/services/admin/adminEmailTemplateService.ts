/**
 * Admin Email Template API Service
 * Handles admin endpoints for email template management
 */

import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

export type EmailTemplateType = 'QUESTIONNAIRE_THANK_YOU' | 'LEAD_WELCOME' | 'CUSTOM';

export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  availableVariables?: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateEmailTemplateData {
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  availableVariables?: Record<string, string>;
  isActive?: boolean;
}

export interface UpdateEmailTemplateData {
  name?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  availableVariables?: Record<string, string>;
  isActive?: boolean;
}

export interface EmailLog {
  id: string;
  templateType: EmailTemplateType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  status: string;
  errorMessage?: string;
  leadId?: string;
  sentAt?: string;
  createdAt: string;
}

export interface EmailLogQuery {
  page?: number;
  limit?: number;
  status?: string;
  templateType?: EmailTemplateType;
  leadId?: string;
}

export interface EmailLogResponse {
  data: EmailLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TemplateTypeOption {
  value: EmailTemplateType;
  label: string;
}

export const adminEmailTemplateService = {
  /**
   * Get all email templates
   */
  async getAll(activeOnly: boolean = false): Promise<EmailTemplate[]> {
    const url = activeOnly
      ? `${apiEndpoints.admin.emailTemplates.list}?activeOnly=true`
      : apiEndpoints.admin.emailTemplates.list;
    const response = await apiClient.get<EmailTemplate[]>(url);
    return response.data;
  },

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<EmailTemplate> {
    const response = await apiClient.get<EmailTemplate>(
      apiEndpoints.admin.emailTemplates.get(id)
    );
    return response.data;
  },

  /**
   * Get available template types
   */
  async getTypes(): Promise<TemplateTypeOption[]> {
    const response = await apiClient.get<TemplateTypeOption[]>(
      apiEndpoints.admin.emailTemplates.types
    );
    return response.data;
  },

  /**
   * Create or update (upsert) template
   */
  async upsert(data: CreateEmailTemplateData): Promise<EmailTemplate> {
    const response = await apiClient.post<EmailTemplate>(
      apiEndpoints.admin.emailTemplates.create,
      data
    );
    return response.data;
  },

  /**
   * Update template
   */
  async update(id: string, data: UpdateEmailTemplateData): Promise<EmailTemplate> {
    const response = await apiClient.put<EmailTemplate>(
      apiEndpoints.admin.emailTemplates.update(id),
      data
    );
    return response.data;
  },

  /**
   * Toggle template active status
   */
  async toggleActive(id: string): Promise<EmailTemplate> {
    const response = await apiClient.patch<EmailTemplate>(
      apiEndpoints.admin.emailTemplates.toggleActive(id)
    );
    return response.data;
  },

  /**
   * Get email send logs
   */
  async getLogs(query: EmailLogQuery = {}): Promise<EmailLogResponse> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.status) params.append('status', query.status);
    if (query.templateType) params.append('templateType', query.templateType);
    if (query.leadId) params.append('leadId', query.leadId);

    const url = params.toString()
      ? `${apiEndpoints.admin.emailTemplates.logs}?${params.toString()}`
      : apiEndpoints.admin.emailTemplates.logs;

    const response = await apiClient.get<EmailLogResponse>(url);
    return response.data;
  },

  /**
   * Initialize default templates
   */
  async initDefaults(): Promise<void> {
    await apiClient.post(apiEndpoints.admin.emailTemplates.initDefaults);
  },
};
