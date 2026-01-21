import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter } from 'lucide-react';
import { adminComplianceService, ApiAuditLog } from '@/lib/api/services/admin';

export function ApiAuditLogsPage() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatusCode, setFilterStatusCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ApiAuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await adminComplianceService.getAuditLogs({
        page,
        limit: 50,
        service: filterService || undefined,
        method: filterMethod || undefined,
        statusCode: filterStatusCode ? parseInt(filterStatusCode) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(Array.isArray(response.data) ? response.data : []);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterService, filterMethod, filterStatusCode, startDate, endDate]);

  const handleViewDetails = (log: ApiAuditLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedLog(null);
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600 bg-green-100';
    if (statusCode >= 300 && statusCode < 400) return 'text-blue-600 bg-blue-100';
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'text-blue-700 bg-blue-100';
      case 'POST':
        return 'text-green-700 bg-green-100';
      case 'PUT':
        return 'text-yellow-700 bg-yellow-100';
      case 'PATCH':
        return 'text-orange-700 bg-orange-100';
      case 'DELETE':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API Audit Logs</h2>
            <p className="text-gray-600 mt-1">Monitor all API requests for compliance and security</p>
          </div>
          <Button variant="outline" onClick={fetchLogs} className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Service</label>
              <input
                type="text"
                placeholder="e.g., customers"
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status Code</label>
              <select
                value={filterStatusCode}
                onChange={(e) => setFilterStatusCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="200">200 (OK)</option>
                <option value="201">201 (Created)</option>
                <option value="400">400 (Bad Request)</option>
                <option value="401">401 (Unauthorized)</option>
                <option value="403">403 (Forbidden)</option>
                <option value="404">404 (Not Found)</option>
                <option value="500">500 (Server Error)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-900">
                        {log.user?.email || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getMethodColor(log.method)}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-900">
                        {log.service}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
                        {log.endpoint}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(log.statusCode)}`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {log.ipAddress || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                        >
                          View Details
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
            <strong>Compliance Note:</strong> API audit logs are essential for security monitoring and
            compliance verification. These logs help demonstrate responsible data handling practices and
            can be used to investigate security incidents or unusual activity patterns.
          </p>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">API Request Details</h3>

              <div className="space-y-4">
                {/* Request Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                    <p className="text-sm text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                    <p className="text-sm text-gray-900">{selectedLog.user?.email || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                    <p className="text-sm text-gray-900">{selectedLog.service}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getMethodColor(selectedLog.method)}`}>
                      {selectedLog.method}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status Code</label>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(selectedLog.statusCode)}`}>
                      {selectedLog.statusCode}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <p className="text-sm text-gray-900">{selectedLog.ipAddress || 'N/A'}</p>
                  </div>
                </div>

                {/* Endpoint */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded font-mono">{selectedLog.endpoint}</p>
                </div>

                {/* User Agent */}
                {selectedLog.userAgent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                    <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{selectedLog.userAgent}</p>
                  </div>
                )}

                {/* Request Body */}
                {selectedLog.requestBody && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Request Body</label>
                    <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedLog.requestBody, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Response Body */}
                {selectedLog.responseBody && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Response Body</label>
                    <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-x-auto max-h-64">
                      {JSON.stringify(selectedLog.responseBody, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleCloseDetails}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
