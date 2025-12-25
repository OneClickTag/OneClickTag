/**
 * Questionnaire API Service
 * Handles public questionnaire endpoints
 */

import axios, { AxiosInstance } from 'axios';
import { getBaseURL, apiEndpoints } from '../config';

// Create axios instance for public endpoints (no auth required)
const publicApi: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export type QuestionType = 'TEXT' | 'TEXTAREA' | 'RADIO' | 'CHECKBOX' | 'RATING' | 'SCALE';

export interface Question {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
  order: number;
  isRequired: boolean;
  isActive: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export const questionnaireService = {
  /**
   * Get all active questions for public questionnaire
   */
  async getActiveQuestions(): Promise<Question[]> {
    const response = await publicApi.get<Question[]>(apiEndpoints.questionnaire.getQuestions);
    return response.data;
  },
};
