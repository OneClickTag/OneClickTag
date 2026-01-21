import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Trash2, Edit2 } from 'lucide-react';
import { adminComplianceService, DataRequest, UpdateDataRequestData } from '@/lib/api/services/admin';

export function DataRequestsPage() {
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingRequest, setEditingRequest] = useState<DataRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<UpdateDataRequestData>({
    status: 'PENDING',
    notes: '',
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await adminComplianceService.getDataRequests({
        page,
        limit: 20,
        status: filterStatus || undefined,
        requestType: filterType || undefined,
      });
      setRequests(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (error: any) {
      console.error('Failed to fetch data requests:', error);
      setMessage({ type: 'error', text: 'Failed to load data requests' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, filterStatus, filterType]);

  const handleExportUserData = async (userId: string, userName: string) => {
    try {
      setMessage(null);
      await adminComplianceService.exportUserData(userId);
      setMessage({ type: 'success', text: `User data exported for ${userName}` });
    } catch (error: any) {
      console.error('Failed to export user data:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to export user data'
      });
    }
  };

  const handleOpenModal = (request: DataRequest) => {
    setEditingRequest(request);
    setFormData({
      status: request.status,
      notes: request.notes || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRequest(null);
    setFormData({
      status: 'PENDING',
      notes: '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    try {
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
      handleCloseModal();
      fetchRequests();
    } catch (error: any) {
      console.error('Failed to update data request:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to update data request'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this data request?')) return;

    try {
      await adminComplianceService.deleteDataRequest(id);
      setMessage({ type: 'success', text: 'Data request deleted successfully!' });
      fetchRequests();
    } catch (error: any) {
      console.error('Failed to delete data request:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to delete data request'
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'ACCESS':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'PORTABILITY':
        return 'bg-purple-100 text-purple-800';
      case 'RECTIFICATION':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Access Requests</h2>
            <p className="text-gray-600 mt-1">Manage GDPR and CCPA user data requests</p>
          </div>
          <Button variant="outline" onClick={fetchRequests} className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
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
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="ACCESS">Access (Art. 15)</option>
              <option value="DELETE">Deletion (Art. 17)</option>
              <option value="PORTABILITY">Portability (Art. 20)</option>
              <option value="RECTIFICATION">Rectification (Art. 16)</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading data requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No data requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed At
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{request.user?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{request.user?.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(request.requestType)}`}>
                          {request.requestType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {request.completedAt ? new Date(request.completedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {request.requestType === 'ACCESS' && (
                          <button
                            onClick={() => handleExportUserData(request.userId, request.user?.name || 'user')}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            title="Export User Data"
                          >
                            <Download className="w-4 h-4 inline mr-1" />
                            Export
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenModal(request)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          <Edit2 className="w-4 h-4 inline mr-1" />
                          Update
                        </button>
                        <button
                          onClick={() => handleDelete(request.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4 inline mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>GDPR Compliance:</strong> You must respond to data access requests within 30 days (or 1 month).
            For deletion requests, ensure all user data is removed from all systems. Use the Export button to download
            all data for access requests.
          </p>
        </div>
      </div>

      {/* Update Modal */}
      {showModal && editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Update Data Request
            </h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>User:</strong> {editingRequest.user?.name} ({editingRequest.user?.email})
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Request Type:</strong> {editingRequest.requestType}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Requested:</strong> {new Date(editingRequest.requestedAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes about this request..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
