import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignsApi } from '../lib/api/services';
import { CreateCampaignRequest, UpdateCampaignRequest } from '../types/campaign.types';

export const CAMPAIGNS_QUERY_KEY = 'campaigns';
export const GTM_CONTAINERS_QUERY_KEY = 'gtm-containers';

export const useCampaigns = (customerId: string) => {
  return useQuery({
    queryKey: [CAMPAIGNS_QUERY_KEY, customerId],
    queryFn: () => campaignsApi.getCampaigns(customerId),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCampaign = (customerId: string, campaignId: string) => {
  return useQuery({
    queryKey: [CAMPAIGNS_QUERY_KEY, customerId, campaignId],
    queryFn: () => campaignsApi.getCampaign(customerId, campaignId),
    enabled: !!customerId && !!campaignId,
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => campaignsApi.createCampaign(data),
    onSuccess: (newCampaign) => {
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_QUERY_KEY, newCampaign.customerId] });
    },
  });
};

export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCampaignRequest) => campaignsApi.updateCampaign(data),
    onSuccess: (updatedCampaign) => {
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_QUERY_KEY, updatedCampaign.customerId] });
      queryClient.setQueryData(
        [CAMPAIGNS_QUERY_KEY, updatedCampaign.customerId, updatedCampaign.id], 
        updatedCampaign
      );
    },
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, campaignId }: { customerId: string; campaignId: string }) =>
      campaignsApi.deleteCampaign(customerId, campaignId),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_QUERY_KEY, customerId] });
    },
  });
};

export const useValidateCSSSelector = () => {
  return useMutation({
    mutationFn: ({ selector, testUrl }: { selector: string; testUrl?: string }) =>
      campaignsApi.validateCSSSelector(selector, testUrl),
  });
};

export const useTestUrlPattern = () => {
  return useMutation({
    mutationFn: ({ patterns, testUrls }: { patterns: string[]; testUrls: string[] }) =>
      campaignsApi.testUrlPattern(patterns, testUrls),
  });
};

export const useGTMContainers = (customerId: string) => {
  return useQuery({
    queryKey: [GTM_CONTAINERS_QUERY_KEY, customerId],
    queryFn: () => campaignsApi.getGTMContainers(customerId),
    enabled: !!customerId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useStartGTMSync = () => {
  return useMutation({
    mutationFn: ({ customerId, campaignId }: { customerId: string; campaignId: string }) =>
      campaignsApi.startGTMSync(customerId, campaignId),
  });
};

export const useGTMSyncProgress = (customerId: string, campaignId: string, syncId: string) => {
  return useQuery({
    queryKey: ['gtm-sync-progress', customerId, campaignId, syncId],
    queryFn: () => campaignsApi.getGTMSyncProgress(customerId, campaignId, syncId),
    enabled: !!customerId && !!campaignId && !!syncId,
    refetchInterval: 2000, // Poll every 2 seconds during sync
    refetchIntervalInBackground: false,
  });
};

export const useTestCampaign = () => {
  return useMutation({
    mutationFn: ({ customerId, campaignId }: { customerId: string; campaignId: string }) =>
      campaignsApi.testCampaign(customerId, campaignId),
  });
};

export const usePreviewCampaign = () => {
  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => campaignsApi.previewCampaign(data),
  });
};