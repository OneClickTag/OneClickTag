import { ApiClient } from './client';
import { paths } from './generated/schema';
import { ApiRequestConfig, ApiResponse } from './types';

// Utility types for extracting types from OpenAPI paths
type GetPaths = {
  [K in keyof paths]: paths[K] extends { get: any } ? K : never;
}[keyof paths];

type PostPaths = {
  [K in keyof paths]: paths[K] extends { post: any } ? K : never;
}[keyof paths];

type PutPaths = {
  [K in keyof paths]: paths[K] extends { put: any } ? K : never;
}[keyof paths];

type PatchPaths = {
  [K in keyof paths]: paths[K] extends { patch: any } ? K : never;
}[keyof paths];

type DeletePaths = {
  [K in keyof paths]: paths[K] extends { delete: any } ? K : never;
}[keyof paths];

// Extract response types
type ExtractResponseType<
  TPath extends keyof paths,
  TMethod extends keyof paths[TPath]
> = paths[TPath][TMethod] extends {
  responses: {
    200: {
      content: {
        'application/json': infer TResponse;
      };
    };
  };
}
  ? TResponse
  : never;

// Extract request body types
type ExtractRequestBodyType<
  TPath extends keyof paths,
  TMethod extends keyof paths[TPath]
> = paths[TPath][TMethod] extends {
  requestBody: {
    content: {
      'application/json': infer TRequest;
    };
  };
}
  ? TRequest
  : never;

// Extract path parameters
type ExtractPathParams<
  TPath extends keyof paths,
  TMethod extends keyof paths[TPath]
> = paths[TPath][TMethod] extends {
  parameters: {
    path: infer TParams;
  };
}
  ? TParams
  : {};

// Extract query parameters
type ExtractQueryParams<
  TPath extends keyof paths,
  TMethod extends keyof paths[TPath]
> = paths[TPath][TMethod] extends {
  parameters: {
    query: infer TParams;
  };
}
  ? TParams
  : {};

// Helper type to replace path parameters in URL (currently unused)
// type ReplacePathParams<
//   TPath extends string,
//   TParams extends Record<string, any>
// > = TPath extends `${infer Before}{${infer Param}}${infer After}`
//   ? TParams extends Record<Param, any>
//     ? ReplacePathParams<`${Before}${string}${After}`, TParams>
//     : TPath
//   : TPath;

export class TypedApiClient {
  private client: ApiClient;

  constructor(client?: ApiClient) {
    this.client = client || new ApiClient();
  }

  // GET requests
  async get<TPath extends GetPaths>(
    path: TPath,
    options?: {
      params?: ExtractPathParams<TPath, 'get'>;
      query?: ExtractQueryParams<TPath, 'get'>;
      config?: ApiRequestConfig;
    }
  ): Promise<ApiResponse<ExtractResponseType<TPath, 'get'>>> {
    const url = this.buildUrl(path as string, options?.params as Record<string, any>, options?.query as Record<string, any>);
    return this.client.get<ExtractResponseType<TPath, 'get'>>(url, options?.config);
  }

  // POST requests
  async post<TPath extends PostPaths>(
    path: TPath,
    options?: {
      params?: ExtractPathParams<TPath, 'post'>;
      query?: ExtractQueryParams<TPath, 'post'>;
      data?: ExtractRequestBodyType<TPath, 'post'>;
      config?: ApiRequestConfig;
    }
  ): Promise<ApiResponse<ExtractResponseType<TPath, 'post'>>> {
    const url = this.buildUrl(path as string, options?.params as Record<string, any>, options?.query as Record<string, any>);
    return this.client.post<ExtractResponseType<TPath, 'post'>>(
      url, 
      options?.data, 
      options?.config
    );
  }

  // PUT requests
  async put<TPath extends PutPaths>(
    path: TPath,
    options?: {
      params?: ExtractPathParams<TPath, 'put'>;
      query?: ExtractQueryParams<TPath, 'put'>;
      data?: ExtractRequestBodyType<TPath, 'put'>;
      config?: ApiRequestConfig;
    }
  ): Promise<ApiResponse<ExtractResponseType<TPath, 'put'>>> {
    const url = this.buildUrl(path as string, options?.params as Record<string, any>, options?.query as Record<string, any>);
    return this.client.put<ExtractResponseType<TPath, 'put'>>(
      url, 
      options?.data, 
      options?.config
    );
  }

  // PATCH requests
  async patch<TPath extends PatchPaths>(
    path: TPath,
    options?: {
      params?: ExtractPathParams<TPath, 'patch'>;
      query?: ExtractQueryParams<TPath, 'patch'>;
      data?: ExtractRequestBodyType<TPath, 'patch'>;
      config?: ApiRequestConfig;
    }
  ): Promise<ApiResponse<ExtractResponseType<TPath, 'patch'>>> {
    const url = this.buildUrl(path as string, options?.params as Record<string, any>, options?.query as Record<string, any>);
    return this.client.patch<ExtractResponseType<TPath, 'patch'>>(
      url, 
      options?.data, 
      options?.config
    );
  }

  // DELETE requests
  async delete<TPath extends DeletePaths>(
    path: TPath,
    options?: {
      params?: ExtractPathParams<TPath, 'delete'>;
      query?: ExtractQueryParams<TPath, 'delete'>;
      config?: ApiRequestConfig;
    }
  ): Promise<ApiResponse<ExtractResponseType<TPath, 'delete'>>> {
    const url = this.buildUrl(path as string, options?.params as Record<string, any>, options?.query as Record<string, any>);
    return this.client.delete<ExtractResponseType<TPath, 'delete'>>(url, options?.config);
  }

  // File upload with progress
  async upload<T = any>(
    url: string,
    file: File,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.client.upload<T>(url, file, config);
  }

  // File download
  async download(
    url: string,
    filename?: string,
    config?: ApiRequestConfig
  ): Promise<void> {
    return this.client.download(url, filename, config);
  }

  // Helper method to build URLs with path and query parameters
  private buildUrl(
    path: string, 
    pathParams?: Record<string, any>, 
    queryParams?: Record<string, any>
  ): string {
    let url = path;

    // Replace path parameters
    if (pathParams) {
      Object.entries(pathParams).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
      });
    }

    // Add query parameters
    if (queryParams) {
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
      
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  // Access to underlying client
  getClient(): ApiClient {
    return this.client;
  }

  // Configuration methods
  setAuthToken(token: string): void {
    this.client.setAuthToken(token);
  }

  clearAuthToken(): void {
    this.client.clearAuthToken();
  }
}

// Create and export default typed instance
export const typedApiClient = new TypedApiClient();

// Export the class for creating custom instances
export default TypedApiClient;