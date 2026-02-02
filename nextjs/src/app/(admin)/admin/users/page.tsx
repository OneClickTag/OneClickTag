'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Search,
  Trash2,
  RefreshCw,
  UserPlus,
  Loader2,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  Mail,
  Calendar as CalendarIcon,
  Shield,
  Building,
} from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  tenant?: {
    id: string;
    name: string;
    domain?: string;
    isActive?: boolean;
  };
  tenantId?: string;
  plan?: {
    id: string;
    name: string;
    price?: number;
  };
  planEndDate?: string;
  oauthTokens?: Array<{
    id: string;
    provider: string;
    scope?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

interface UsersResponse {
  data: AdminUser[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

type SortField = 'name' | 'email' | 'role' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function AdminUsersPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'USER' as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
    planId: '' as string,
    planEndDate: '' as string,
  });

  // Fetch available plans
  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<Plan[]>('/api/public/plans'),
  });
  const plans = plansData || [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', searchTerm, selectedRole, page, sortBy, sortOrder],
    queryFn: () => {
      const params: Record<string, string> = {
        limit: '20',
        page: page.toString(),
        sortBy,
        sortOrder,
      };
      if (searchTerm) params.search = searchTerm;
      if (selectedRole && selectedRole !== 'all') params.role = selectedRole;
      return api.get<UsersResponse>('/api/admin/users', { params });
    },
  });

  // Fetch user details when view modal opens
  const { data: userDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin', 'user', selectedUserId],
    queryFn: () => api.get<AdminUser>(`/api/admin/users/${selectedUserId}`),
    enabled: !!selectedUserId && isViewModalOpen,
  });

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedUserId(null);
  };

  const users = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/api/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (userIds: string[]) =>
      api.post('/api/admin/users/batch-delete', { userIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setSelectedUsers(new Set());
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: { name: string; email: string; role: string }) =>
      api.post('/api/admin/users', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      handleCloseModal();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; role?: string; planId?: string | null; planEndDate?: string | null } }) =>
      api.patch(`/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      handleCloseModal();
    },
  });

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selectedUsers.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedUsers.size} users?`))
      return;

    try {
      await batchDeleteMutation.mutateAsync(Array.from(selectedUsers));
    } catch (error) {
      console.error('Failed to delete users:', error);
      alert('Failed to delete users');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteMutation.mutateAsync(userId);
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'USER', planId: '', planEndDate: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      planId: user.plan?.id || '',
      planEndDate: user.planEndDate ? user.planEndDate.split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'USER', planId: '', planEndDate: '' });
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await updateUserMutation.mutateAsync({
          id: editingUser.id,
          data: {
            name: formData.name,
            role: formData.role,
            planId: formData.planId || null,
            planEndDate: formData.planEndDate || null,
          },
        });
      } else {
        await createUserMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('Failed to save user');
    }
  };

  // Check if selected plan is free (price = 0)
  const selectedPlan = plans.find((p) => p.id === formData.planId);
  const showPlanEndDate = selectedPlan && Number(selectedPlan.price) > 0;

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (selectedRole && selectedRole !== 'all') params.set('role', selectedRole);

      const response = await fetch(`/api/admin/users/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users Management</h2>
          <p className="text-gray-600 mt-1">Manage user accounts and permissions</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleOpenCreateModal} className="flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={selectedRole}
            onValueChange={(value) => {
              setSelectedRole(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Regular Users</p>
            <p className="text-2xl font-bold text-gray-700">
              {users.filter(u => u.role === 'USER').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Admins</p>
            <p className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'ADMIN').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Super Admins</p>
            <p className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.role === 'SUPER_ADMIN').length}
            </p>
          </div>
        </div>
      )}

      {/* Batch Actions */}
      {selectedUsers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-900 font-medium">
            {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
              className="flex items-center space-x-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              {batchDeleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Delete Selected</span>
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.size === users.length && users.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        User
                        {getSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center">
                        Role
                        {getSortIcon('role')}
                      </div>
                    </TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        Created
                        {getSortIcon('createdAt')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleViewUser(user.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => handleSelectUser(user.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.plan ? (
                          <div>
                            <span className="font-medium text-gray-900">{user.plan.name}</span>
                            {user.planEndDate && (
                              <div className="text-xs text-gray-500">
                                Expires: {new Date(user.planEndDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No plan</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {user.tenant?.name || 'No tenant'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleViewUser(user.id)}
                          className="text-gray-600 hover:text-gray-900 text-sm font-medium mr-4"
                        >
                          <Eye className="w-4 h-4 inline mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-600">
                Showing {users.length} of {total} users (Page {page} of {totalPages})
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit/Create User Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Create New User'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
                disabled={!!editingUser}
              />
              {editingUser && (
                <p className="text-xs text-gray-500">Email cannot be changed after creation</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'USER' | 'ADMIN' | 'SUPER_ADMIN') =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select
                value={formData.planId || '__none__'}
                onValueChange={(value) => {
                  const planId = value === '__none__' ? '' : value;
                  setFormData({ ...formData, planId, planEndDate: planId ? formData.planEndDate : '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No plan</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} {Number(plan.price) === 0 ? '(Free)' : `($${plan.price})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showPlanEndDate && (
              <div className="space-y-2">
                <Label>Plan End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.planEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.planEndDate ? format(new Date(formData.planEndDate), "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.planEndDate ? new Date(formData.planEndDate) : undefined}
                      onSelect={(date) => setFormData({ ...formData, planEndDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500">Required for paid plans</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {(createUserMutation.isPending || updateUserMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              User Details
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : userDetail ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Account Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{userDetail.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {userDetail.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(userDetail.role)}`}>
                      <Shield className="w-3 h-3 inline mr-1" />
                      {userDetail.role}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      {new Date(userDetail.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tenant Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Organization
                </h4>
                {userDetail.tenant ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{userDetail.tenant.name}</p>
                    </div>
                    {userDetail.tenant.domain && (
                      <div>
                        <p className="text-sm text-gray-500">Domain</p>
                        <p className="font-medium">{userDetail.tenant.domain}</p>
                      </div>
                    )}
                    {userDetail.tenant.isActive !== undefined && (
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${userDetail.tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {userDetail.tenant.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No organization assigned</p>
                )}
              </div>

              {/* Plan Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Subscription Plan</h4>
                {userDetail.plan ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Plan</p>
                      <p className="font-medium">{userDetail.plan.name}</p>
                    </div>
                    {userDetail.planEndDate && (
                      <div>
                        <p className="text-sm text-gray-500">Expires</p>
                        <p className="font-medium">{new Date(userDetail.planEndDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No plan assigned</p>
                )}
              </div>

              {/* OAuth Tokens */}
              {userDetail.oauthTokens && userDetail.oauthTokens.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Connected Accounts</h4>
                  <div className="space-y-2">
                    {userDetail.oauthTokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="font-medium capitalize">{token.provider}</span>
                          {token.scope && (
                            <span className="text-xs text-gray-500 ml-2">({token.scope})</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          Connected: {new Date(token.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">User not found</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseViewModal}>
              Close
            </Button>
            {userDetail && (
              <Button onClick={() => {
                handleCloseViewModal();
                handleOpenEditModal(userDetail);
              }}>
                Edit User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
