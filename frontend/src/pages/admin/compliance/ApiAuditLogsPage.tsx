import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, FileText, Eye, Search, Calendar } from 'lucide-react';
import {
  adminComplianceService,
  ApiAuditLog,
  AuditLogQueryParams,
} from '@/lib/api/services/admin/adminComplianceService';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800',
  POST: 'bg-green-100 text-green-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  PATCH: 'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
};

const getStatusType = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 400) return 'error';
  return 'warning';
};

export function ApiAuditLogsPage() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ApiAuditLog | null>(null);

  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterService, setFilterService] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('');
  const [filterStatusCode, setFilterStatusCode] = useState<string>('');
  const [searchUserId, setSearchUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const params: AuditLogQueryParams = {
        page: currentPage,
        limit: 20,
      };

      if (filterService) params.service = filterService;
      if (filterMethod) params.method = filterMethod;
      if (filterStatusCode) params.statusCode = parseInt(filterStatusCode);
      if (searchUserId) params.userId = searchUserId;
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) params.endDate = new Date(endDate).toISOString();

      const response = await adminComplianceService.getAuditLogs(params);
      setLogs(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      setMessage({ type: 'error', text: 'Failed to load audit logs' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filterService, filterMethod, filterStatusCode, searchUserId, startDate, endDate]);

  const handleViewDetails = (log: ApiAuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const clearFilters = () => {
    setFilterService('');
    setFilterMethod('');
    setFilterStatusCode('');
    setSearchUserId('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  if (loading && currentPage === 1) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading audit logs...</p>
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
            <h2 className="text-2xl font-bold text-gray-900">API Audit Logs</h2>
            <p className="text-gray-600 mt-1">Track all API requests for compliance and security monitoring</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={clearFilters} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Clear Filters</span>
            </Button>
            <Button variant="outline" onClick={fetchLogs} className="flex items-center space-x-2">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="service">Service</Label>
              <Input
                id="service"
                type="text"
                value={filterService}
                onChange={(e) => {
                  setFilterService(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="e.g., compliance"
              />
            </div>
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select
                value={filterMethod}
                onValueChange={(value) => {
                  setFilterMethod(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Methods</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="statusCode">Status Code</Label>
              <Select
                value={filterStatusCode}
                onValueChange={(value) => {
                  setFilterStatusCode(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="200">200 - OK</SelectItem>
                  <SelectItem value="201">201 - Created</SelectItem>
                  <SelectItem value="400">400 - Bad Request</SelectItem>
                  <SelectItem value="401">401 - Unauthorized</SelectItem>
                  <SelectItem value="403">403 - Forbidden</SelectItem>
                  <SelectItem value="404">404 - Not Found</SelectItem>
                  <SelectItem value="500">500 - Server Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="userId">User ID</Label>
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
                  placeholder="Search by user ID..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No audit logs found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Endpoint
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{log.user?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{log.user?.email || log.userId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge className={METHOD_COLORS[log.method] || 'bg-gray-100 text-gray-800'}>
                            {log.method}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          <code className="text-xs">{log.endpoint}</code>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{log.service}</td>
                        <td className="px-6 py-4 text-sm">
                          <Badge className={STATUS_COLORS[getStatusType(log.statusCode)]}>{log.statusCode}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{log.ipAddress || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                            className="inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
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
            <strong>Audit Trail:</strong> All API requests are logged for compliance and security purposes. Logs include
            user information, request details, and response status. Use filters to narrow down specific activities or
            troubleshoot issues.
          </p>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>Complete information about this API request</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Timestamp:</span>
                    <p className="text-gray-900 mt-1">
                      {new Date(selectedLog.timestamp).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">User:</span>
                    <p className="text-gray-900 mt-1">{selectedLog.user?.email || selectedLog.userId}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Service:</span>
                    <p className="text-gray-900 mt-1">{selectedLog.service}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Method:</span>
                    <p className="text-gray-900 mt-1">
                      <Badge className={METHOD_COLORS[selectedLog.method]}>{selectedLog.method}</Badge>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Endpoint:</span>
                    <p className="text-gray-900 mt-1">
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">{selectedLog.endpoint}</code>
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status Code:</span>
                    <p className="text-gray-900 mt-1">
                      <Badge className={STATUS_COLORS[getStatusType(selectedLog.statusCode)]}>
                        {selectedLog.statusCode}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">IP Address:</span>
                    <p className="text-gray-900 mt-1">{selectedLog.ipAddress || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div>
                  <span className="font-medium text-gray-700">User Agent:</span>
                  <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-3 rounded">{selectedLog.userAgent}</p>
                </div>
              )}

              {/* Request Body */}
              {selectedLog.requestBody && (
                <div>
                  <span className="font-medium text-gray-700">Request Body:</span>
                  <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {/* Response Body */}
              {selectedLog.responseBody && (
                <div>
                  <span className="font-medium text-gray-700">Response Body:</span>
                  <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.responseBody, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
