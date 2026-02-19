'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useCallback } from 'react';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export function useApi() {
  const { getToken } = useAuth();

  const request = useCallback(
    async <T>(url: string, options: ApiOptions = {}): Promise<T> => {
      const { skipAuth = false, headers: customHeaders, params, ...rest } = options;

      // Build URL with query params
      let finalUrl = url;
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          finalUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...customHeaders,
      };

      if (!skipAuth) {
        const token = await getToken();
        if (token) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(finalUrl, {
        ...rest,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      return response.json();
    },
    [getToken]
  );

  const get = useCallback(
    <T>(url: string, options?: ApiOptions) => request<T>(url, { ...options, method: 'GET' }),
    [request]
  );

  const post = useCallback(
    <T>(url: string, data?: unknown, options?: ApiOptions) =>
      request<T>(url, { ...options, method: 'POST', body: JSON.stringify(data) }),
    [request]
  );

  const put = useCallback(
    <T>(url: string, data?: unknown, options?: ApiOptions) =>
      request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    [request]
  );

  const patch = useCallback(
    <T>(url: string, data?: unknown, options?: ApiOptions) =>
      request<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
    [request]
  );

  const del = useCallback(
    <T>(url: string, options?: ApiOptions) => request<T>(url, { ...options, method: 'DELETE' }),
    [request]
  );

  return { get, post, put, patch, delete: del, request };
}
