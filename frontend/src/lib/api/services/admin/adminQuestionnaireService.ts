/**
 * Admin Questionnaire API Service
 * Handles admin endpoints for questionnaire management
 */

import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

export type QuestionType = 'TEXT' | 'TEXTAREA' | 'RADIO' | 'CHECKBOX' | 'RATING' | 'SCALE';

export interface AdminQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
  order: number;
  isRequired: boolean;
  isActive: boolean;
  category?: string;
  responseCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateQuestionData {
  question: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
  order?: number;
  isRequired?: boolean;
  isActive?: boolean;
  category?: string;
}

export interface UpdateQuestionData {
  question?: string;
  type?: QuestionType;
  options?: string[];
  placeholder?: string;
  order?: number;
  isRequired?: boolean;
  isActive?: boolean;
  category?: string;
}

export interface QuestionReorder {
  id: string;
  order: number;
}

export interface ResponseDistribution {
  answer: string;
  count: number;
  percentage?: number;
}

export interface QuestionStats {
  id: string;
  question: string;
  type: QuestionType;
  category?: string;
  totalResponses: number;
  distribution: ResponseDistribution[];
  average?: number | null;
}

export const adminQuestionnaireService = {
  /**
   * Get all questions (including inactive)
   */
  async getAll(activeOnly: boolean = false): Promise<AdminQuestion[]> {
    const url = activeOnly
      ? `${apiEndpoints.admin.questionnaire.list}?activeOnly=true`
      : apiEndpoints.admin.questionnaire.list;
    const response = await apiClient.get<AdminQuestion[]>(url);
    return response.data;
  },

  /**
   * Get question by ID
   */
  async getById(id: string): Promise<AdminQuestion> {
    const response = await apiClient.get<AdminQuestion>(apiEndpoints.admin.questionnaire.get(id));
    return response.data;
  },

  /**
   * Create new question
   */
  async create(data: CreateQuestionData): Promise<AdminQuestion> {
    const response = await apiClient.post<AdminQuestion>(
      apiEndpoints.admin.questionnaire.create,
      data
    );
    return response.data;
  },

  /**
   * Update question
   */
  async update(id: string, data: UpdateQuestionData): Promise<AdminQuestion> {
    const response = await apiClient.put<AdminQuestion>(
      apiEndpoints.admin.questionnaire.update(id),
      data
    );
    return response.data;
  },

  /**
   * Delete question
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.admin.questionnaire.delete(id));
  },

  /**
   * Toggle question active status
   */
  async toggleActive(id: string): Promise<AdminQuestion> {
    const response = await apiClient.patch<AdminQuestion>(
      apiEndpoints.admin.questionnaire.toggleActive(id)
    );
    return response.data;
  },

  /**
   * Reorder questions
   */
  async reorder(questionOrders: QuestionReorder[]): Promise<void> {
    await apiClient.post(apiEndpoints.admin.questionnaire.reorder, { questionOrders });
  },

  /**
   * Get response distribution for a question
   */
  async getQuestionResponses(id: string): Promise<ResponseDistribution[]> {
    const response = await apiClient.get<ResponseDistribution[]>(
      apiEndpoints.admin.questionnaire.responses(id)
    );
    return response.data;
  },

  /**
   * Get all response statistics for all questions
   */
  async getAllStats(): Promise<QuestionStats[]> {
    const response = await apiClient.get<QuestionStats[]>(
      apiEndpoints.admin.questionnaire.allStats
    );
    return response.data;
  },
};
