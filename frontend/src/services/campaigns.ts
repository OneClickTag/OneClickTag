import axios from 'axios';
import { Campaign, CreateCampaignRequest, UpdateCampaignRequest, GTMSyncProgress } from '../types/campaign.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const campaignsApi = {
  // Get campaigns for a customer
  getCampaigns: async (customerId: string): Promise<Campaign[]> => {
    const response = await api.get(`/customers/${customerId}/campaigns`);
    return response.data;
  },

  // Get single campaign
  getCampaign: async (customerId: string, campaignId: string): Promise<Campaign> => {
    const response = await api.get(`/customers/${customerId}/campaigns/${campaignId}`);
    return response.data;
  },

  // Create new campaign
  createCampaign: async (data: CreateCampaignRequest): Promise<Campaign> => {
    const { customerId, ...campaignData } = data;
    const response = await api.post(`/customers/${customerId}/campaigns`, campaignData);
    return response.data;
  },

  // Update campaign
  updateCampaign: async (data: UpdateCampaignRequest): Promise<Campaign> => {
    const { id, customerId, ...updateData } = data;
    const response = await api.patch(`/customers/${customerId}/campaigns/${id}`, updateData);
    return response.data;
  },

  // Delete campaign
  deleteCampaign: async (customerId: string, campaignId: string): Promise<void> => {
    await api.delete(`/customers/${customerId}/campaigns/${campaignId}`);
  },

  // Validate CSS selector
  validateCSSSelector: async (selector: string, testUrl?: string): Promise<{ 
    isValid: boolean; 
    elementCount: number; 
    examples: string[];
    suggestions?: string[];
  }> => {
    const response = await api.post('/campaigns/validate-selector', { 
      selector, 
      testUrl 
    });
    return response.data;
  },

  // Test URL pattern
  testUrlPattern: async (patterns: string[], testUrls: string[]): Promise<{
    matches: { url: string; matched: boolean; matchedPattern?: string }[];
    suggestions?: string[];
  }> => {
    const response = await api.post('/campaigns/test-url-pattern', { 
      patterns, 
      testUrls 
    });
    return response.data;
  },

  // Get GTM containers for customer
  getGTMContainers: async (customerId: string): Promise<{
    containers: Array<{
      containerId: string;
      name: string;
      publicId: string;
      domain: string[];
      status: 'active' | 'inactive';
    }>;
  }> => {
    const response = await api.get(`/customers/${customerId}/gtm/containers`);
    return response.data;
  },

  // Start GTM sync process
  startGTMSync: async (customerId: string, campaignId: string): Promise<{ syncId: string }> => {
    const response = await api.post(`/customers/${customerId}/campaigns/${campaignId}/gtm/sync`);
    return response.data;
  },

  // Get GTM sync progress
  getGTMSyncProgress: async (customerId: string, campaignId: string, syncId: string): Promise<GTMSyncProgress> => {
    const response = await api.get(`/customers/${customerId}/campaigns/${campaignId}/gtm/sync/${syncId}`);
    return response.data;
  },

  // Test campaign configuration
  testCampaign: async (customerId: string, campaignId: string): Promise<{
    success: boolean;
    results: {
      triggerTest: { success: boolean; message: string; details?: any };
      gtmTest: { success: boolean; message: string; details?: any };
      conversionTest: { success: boolean; message: string; details?: any };
    };
  }> => {
    const response = await api.post(`/customers/${customerId}/campaigns/${campaignId}/test`);
    return response.data;
  },

  // Preview campaign (dry-run without creating)
  previewCampaign: async (data: CreateCampaignRequest): Promise<{
    gtmPreview: {
      tagConfig: any;
      triggerConfig: any;
      variableConfigs: any[];
    };
    estimatedComplexity: 'Low' | 'Medium' | 'High';
    warnings: string[];
    recommendations: string[];
  }> => {
    const { customerId, ...campaignData } = data;
    const response = await api.post(`/customers/${customerId}/campaigns/preview`, campaignData);
    return response.data;
  },
};