import React from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { loadingManager } from '../loading/loadingManager';
import { errorHandler } from '../errors/errorHandler';
import { ApiError, ApiResponse, LoadingState } from '../types';

// Loading state hook
export function useApiLoading(requestId?: string): boolean {
  const [loading, setLoading] = React.useState(() => loadingManager.isLoading(requestId));

  React.useEffect(() => {
    const unsubscribe = loadingManager.addListener((loadingState: LoadingState, isGlobalLoading: boolean) => {
      if (requestId) {
        setLoading(loadingState[requestId] || false);
      } else {
        setLoading(isGlobalLoading);
      }
    });

    return unsubscribe;
  }, [requestId]);

  return loading;
}

// Global loading state hook
export function useGlobalLoading(): {
  isLoading: boolean;
  loadingCount: number;
  loadingStates: LoadingState;
} {
  const [state, setState] = React.useState(() => ({
    isLoading: loadingManager.isLoading(),
    loadingCount: loadingManager.getLoadingCount(),
    loadingStates: loadingManager.getLoadingStates(),
  }));

  React.useEffect(() => {
    const unsubscribe = loadingManager.addListener((loadingStates: LoadingState, isGlobalLoading: boolean) => {
      setState({
        isLoading: isGlobalLoading,
        loadingCount: Object.keys(loadingStates).length,
        loadingStates,
      });
    });

    return unsubscribe;
  }, []);

  return state;
}

// Error state hook
export function useApiErrors(): {
  errors: ApiError[];
  clearErrors: () => void;
  removeError: (index: number) => void;
} {
  const [errors, setErrors] = React.useState<ApiError[]>([]);

  React.useEffect(() => {
    const unsubscribe = errorHandler.addListener((error: ApiError) => {
      setErrors(prev => [...prev, error]);
    });

    return unsubscribe;
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  const removeError = React.useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  return { errors, clearErrors, removeError };
}

// Generic API query hook
export function useApiQuery<TData = any, TError = ApiError>(
  queryKey: any[],
  queryFn: () => Promise<ApiResponse<TData>>,
  options?: Omit<UseQueryOptions<ApiResponse<TData>, TError, TData>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn,
    select: (data) => data.data, // Extract data from ApiResponse
    ...options,
  });
}

// Generic API mutation hook
export function useApiMutation<TData = any, TError = ApiError, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: Omit<UseMutationOptions<ApiResponse<TData>, TError, TVariables>, 'mutationFn'>
) {

  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Call user's onSuccess callback
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Error is already handled by errorHandler in interceptors
      // Call user's onError callback
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
}

// Optimistic update mutation hook
export function useOptimisticMutation<TData = any, TError = ApiError, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: {
    queryKey: any[];
    updateFn: (oldData: any, variables: TVariables) => any;
    rollbackFn?: (oldData: any, error: TError, variables: TVariables) => any;
  } & Omit<UseMutationOptions<ApiResponse<TData>, TError, TVariables>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(options.queryKey);

      // Optimistically update
      queryClient.setQueryData(options.queryKey, (old: any) => options.updateFn(old, variables));

      // Return context with snapshot
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback to previous data
      if (context?.previousData) {
        queryClient.setQueryData(options.queryKey, context.previousData);
      }

      // Apply custom rollback if provided
      if (options.rollbackFn && context?.previousData) {
        queryClient.setQueryData(options.queryKey, (_old: any) => 
          options.rollbackFn!(context.previousData, error as TError, variables)
        );
      }

      options.onError?.(error as TError, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: options.queryKey });
      options.onSettled?.(data, error as TError | null, variables, context);
    },
    onSuccess: options.onSuccess,
  });
}

// Infinite query hook for paginated data
export function useApiInfiniteQuery<TData = any, TError = ApiError>(
  queryKey: any[],
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<ApiResponse<{ data: TData[]; pagination: any }>>,
  options?: {
    getNextPageParam?: (lastPage: any, allPages: any[]) => number | undefined;
    getPreviousPageParam?: (firstPage: any, allPages: any[]) => number | undefined;
    initialPageParam?: number;
  } & Omit<UseQueryOptions<any, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const pages = [];
      let pageParam = options?.initialPageParam || 1;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await queryFn({ pageParam });
        pages.push(response.data);
        
        const nextPage = options?.getNextPageParam?.(response.data, pages);
        if (nextPage) {
          pageParam = nextPage;
        } else {
          hasNextPage = false;
        }
      }

      return {
        pages,
        pageParams: pages.map((_: any, index: number) => (options?.initialPageParam || 1) + index),
      };
    },
    select: (data: any) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      allData: data.pages.flatMap((page: any) => page.data || []),
    }),
    ...options,
  });
}

// Real-time data hook with polling
export function useApiPolling<TData = any, TError = ApiError>(
  queryKey: any[],
  queryFn: () => Promise<ApiResponse<TData>>,
  options?: {
    interval?: number;
    enabled?: boolean;
    maxRetries?: number;
  } & Omit<UseQueryOptions<ApiResponse<TData>, TError, TData>, 'queryKey' | 'queryFn'>
) {
  const [isPolling, setIsPolling] = React.useState(options?.enabled !== false);
  const retryCount = React.useRef(0);

  const query = useApiQuery(queryKey, queryFn, {
    ...options,
    enabled: isPolling,
    refetchInterval: options?.interval || 5000,
    refetchIntervalInBackground: true,
  });

  const startPolling = React.useCallback(() => {
    retryCount.current = 0;
    setIsPolling(true);
  }, []);

  const stopPolling = React.useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    ...query,
    isPolling,
    startPolling,
    stopPolling,
  };
}

// Batch request hook
export function useBatchRequests<TData = any, TError = ApiError>(
  requests: Array<{
    key: string;
    queryFn: () => Promise<ApiResponse<TData>>;
  }>,
  options?: {
    enabled?: boolean;
    batchSize?: number;
    delay?: number;
  }
) {
  const [results, setResults] = React.useState<Record<string, { data?: TData; error?: TError; loading: boolean }>>({});

  React.useEffect(() => {
    if (!options?.enabled) return;

    const batchSize = options.batchSize || 5;
    const delay = options.delay || 100;

    const executeRequests = async () => {
      // Initialize results
      const initialResults = requests.reduce((acc, req) => {
        acc[req.key] = { loading: true };
        return acc;
      }, {} as typeof results);
      setResults(initialResults);

      // Process requests in batches
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        
        // Execute batch
        const batchPromises = batch.map(async (req) => {
          try {
            const response = await req.queryFn();
            return { key: req.key, data: response.data, error: null };
          } catch (error) {
            return { key: req.key, data: null, error: error as TError };
          }
        });

        const batchResults = await Promise.all(batchPromises);

        // Update results
        setResults(prev => {
          const updated = { ...prev };
          batchResults.forEach(result => {
            updated[result.key] = {
              data: result.data || undefined,
              error: result.error || undefined,
              loading: false,
            };
          });
          return updated;
        });

        // Delay between batches
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    executeRequests();
  }, [requests, options?.enabled, options?.batchSize, options?.delay]);

  return results;
}