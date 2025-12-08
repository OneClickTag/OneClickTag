import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  isActive: boolean;
  tenant?: {
    id: string;
    name: string;
    domain: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserQueryParams {
  search?: string;
  role?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UsersListResponse {
  data: AdminUser[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateUserData {
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface UpdateUserData {
  name?: string;
  role?: string;
  isActive?: boolean;
}

export interface BatchDeleteData {
  userIds: string[];
}

export interface BatchUpdateRoleData {
  userIds: string[];
  role: string;
}

export const adminUsersService = {
  /**
   * Get all users with filtering and pagination
   */
  async getAll(params?: UserQueryParams): Promise<UsersListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.tenantId) queryParams.append('tenantId', params.tenantId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = params ? `${apiEndpoints.admin.users.list}?${queryParams.toString()}` : apiEndpoints.admin.users.list;
    const response = await apiClient.get<UsersListResponse>(url);
    return response.data;
  },

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<AdminUser> {
    const response = await apiClient.get<AdminUser>(apiEndpoints.admin.users.get(id));
    return response.data;
  },

  /**
   * Create new user
   */
  async create(data: CreateUserData): Promise<AdminUser> {
    const response = await apiClient.post<AdminUser>(apiEndpoints.admin.users.create, data);
    return response.data;
  },

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserData): Promise<AdminUser> {
    const response = await apiClient.put<AdminUser>(apiEndpoints.admin.users.update(id), data);
    return response.data;
  },

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.admin.users.delete(id));
  },

  /**
   * Batch delete users
   */
  async batchDelete(data: BatchDeleteData): Promise<void> {
    await apiClient.post(apiEndpoints.admin.users.batchDelete, data);
  },

  /**
   * Batch update role
   */
  async batchUpdateRole(data: BatchUpdateRoleData): Promise<void> {
    await apiClient.post(apiEndpoints.admin.users.batchUpdateRole, data);
  },

  /**
   * Get user statistics
   */
  async getStats(): Promise<any> {
    const response = await apiClient.get(apiEndpoints.admin.users.stats);
    return response.data;
  },
};
