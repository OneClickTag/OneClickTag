import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, FileText, Download, Pencil, Trash2, Search } from 'lucide-react';
import {
  adminComplianceService,
  DataRequest,
  UpdateDataRequestData,
  DataRequestQueryParams,
} from '@/lib/api/services/admin/adminComplianceService';

const REQUEST_TYPE_LABELS: Record<string, string> = {
  ACCESS: 'Data Access',
  DELETE: 'Data Deletion',
  PORTABILITY: 'Data Portability',
  RECTIFICATION: 'Data Rectification',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export function DataRequestsPage() {
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<DataRequest | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<DataRequest | null>(null);

  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchUserId, setSearchUserId] = useState('');

  const [formData, setFormData] = useState<UpdateDataRequestData>({
    status: 'PENDING',
    notes: '',
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const params: DataRequestQueryParams = {
        page: currentPage,
        limit: 10,
      };

      if (filterStatus) params.status = filterStatus;
      if (filterType) params.requestType = filterType;
      if (searchUserId) params.userId = searchUserId;

      const response = await adminComplianceService.getDataRequests(params);
      // Backend returns { requests, total, skip, take } format
      // Handle both the expected format and the actual backend format
      const requestsData = response.data || (response as any).requests || [];
      setRequests(Array.isArray(requestsData) ? requestsData : []);

      // Calculate totalPages from the response
      const total = response.meta?.totalPages || Math.ceil(((response as any).total || 0) / 10) || 1;
      setTotalPages(total);
    } catch (error: any) {
      console.error('Failed to fetch data requests:', error);
      setMessage({ type: 'error', text: 'Failed to load data requests' });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentPage, filterStatus, filterType, searchUserId]);

  const handleOpenDialog = (request: DataRequest) => {
    setEditingRequest(request);
    setFormData({
      status: request.status,
      notes: request.notes || '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRequest(null);
    setFormData({
      status: 'PENDING',
      notes: '',
    });
  };

  const handleSave = async () => {
    if (!editingRequest) return;

    try {
      setSaving(true);
      setMessage(null);

      const updateData: UpdateDataRequestData = {
        status: formData.status,
        notes: formData.notes,
      };

      if (formData.status === 'COMPLETED') {
        updateData.completedAt = new Date().toISOString();
      }

      await adminComplianceService.updateDataRequest(editingRequest.id, updateData);
      setMessage({ type: 'success', text: 'Data request updated successfully!' });
      handleCloseDialog();
      fetchRequests();
    } catch (error: any) {
      console.error('Failed to update data request:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to update data request',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!requestToDelete) return;

    try {
      setMessage(null);
      await adminComplianceService.deleteDataRequest(requestToDelete.id);
      setMessage({ type: 'success', text: 'Data request deleted successfully!' });
      setDeleteConfirmOpen(false);
      setRequestToDelete(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Failed to delete data request:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to delete data request',
      });
    }
  };

  const handleExportUserData = async (userId: string) => {
    try {
      setMessage(null);
      await adminComplianceService.exportUserData(userId);
      setMessage({ type: 'success', text: 'User data exported successfully!' });
    } catch (error: any) {
      console.error('Failed to export user data:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to export user data',
      });
    }
  };

  const updateFormData = (field: keyof UpdateDataRequestData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading && currentPage === 1) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading data requests...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">GDPR Data Requests</h2>
            <p className="text-gray-600 mt-1">Manage user data subject access requests</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchRequests} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">Filter by Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(value) => {
                  setFilterStatus(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Filter by Type</Label>
              <Select
                value={filterType}
                onValueChange={(value) => {
                  setFilterType(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="ACCESS">Data Access</SelectItem>
                  <SelectItem value="DELETE">Data Deletion</SelectItem>
                  <SelectItem value="PORTABILITY">Data Portability</SelectItem>
                  <SelectItem value="RECTIFICATION">Data Rectification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="userId">Search by User ID</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="userId"
                  type="text"
                  value={searchUserId}
                  onChange={(e) => {
                    setSearchUserId(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Enter user ID..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No data requests found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request Type
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested At
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed At
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {requests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{request.user?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{request.user?.email || request.userId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {REQUEST_TYPE_LABELS[request.requestType] || request.requestType}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge className={STATUS_COLORS[request.status]}>{request.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(request.requestedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {request.completedAt
                            ? new Date(request.completedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {request.requestType === 'ACCESS' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportUserData(request.userId)}
                              className="inline-flex items-center space-x-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>Export</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(request)}
                            className="inline-flex items-center space-x-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Update</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRequestToDelete(request);
                              setDeleteConfirmOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>GDPR Compliance:</strong> Data subject requests must be fulfilled within 30 days. Access requests
            allow users to download their data, deletion requests remove all user data, portability requests export data
            in a machine-readable format, and rectification requests allow users to correct their information.
          </p>
        </div>
      </div>

      {/* Update Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Data Request</DialogTitle>
            <DialogDescription>
              Update the status and notes for this data request. Mark as completed once the request has been fulfilled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingRequest && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">User:</span>
                  <span className="text-gray-900">{editingRequest.user?.email || editingRequest.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Request Type:</span>
                  <span className="text-gray-900">
                    {REQUEST_TYPE_LABELS[editingRequest.requestType] || editingRequest.requestType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Requested At:</span>
                  <span className="text-gray-900">
                    {new Date(editingRequest.requestedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value: any) => updateFormData('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Add any notes or comments about this request..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Updating...' : 'Update Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Data Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this data request? This action cannot be undone and may affect compliance
              records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
