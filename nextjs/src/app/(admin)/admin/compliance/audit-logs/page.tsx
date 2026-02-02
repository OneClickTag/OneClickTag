'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Eye,
  Search,
  RefreshCw,
  Loader2,
  User,
  Settings,
  Shield,
  Database,
  FileText,
} from 'lucide-react';

interface AuditLogDetails {
  endpoint?: string;
  responseStatus?: number;
  durationMs?: number;
  customerName?: string;
  error?: string;
}

interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: AuditLogDetails;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['compliance', 'audit-logs', actionFilter, resourceFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (resourceFilter !== 'all') params.set('resource', resourceFilter);
      try {
        const response = await api.get<{ data: AuditLog[]; meta: { total: number; totalPages: number } }>(
          `/api/compliance/audit-logs?${params.toString()}`
        );
        return response;
      } catch (err) {
        // API might not exist yet
        console.warn('Audit logs API not available:', err);
        return { data: [], meta: { total: 0, totalPages: 1 } };
      }
    },
    retry: false,
  });

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.userEmail?.toLowerCase().includes(searchLower) ||
      log.action?.toLowerCase().includes(searchLower) ||
      log.resource?.toLowerCase().includes(searchLower) ||
      log.details?.endpoint?.toLowerCase().includes(searchLower) ||
      log.details?.customerName?.toLowerCase().includes(searchLower)
    );
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'POST':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'PUT':
      case 'PATCH':
        return <Settings className="w-4 h-4 text-blue-500" />;
      case 'DELETE':
        return <Database className="w-4 h-4 text-red-500" />;
      case 'GET':
        return <User className="w-4 h-4 text-purple-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'POST':
        return 'bg-green-100 text-green-700';
      case 'PUT':
      case 'PATCH':
        return 'bg-blue-100 text-blue-700';
      case 'DELETE':
        return 'bg-red-100 text-red-700';
      case 'GET':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-gray-600 mt-1">Track all system activities and changes</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="API Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="GTM">GTM API</SelectItem>
            <SelectItem value="Google Ads">Google Ads API</SelectItem>
            <SelectItem value="GA4">GA4 API</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No audit logs found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>API Service</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{log.userEmail || 'System'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getActionColor(log.action || '')}`}>
                        {getActionIcon(log.action || '')}
                        {log.action || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.resource || '-'}</span>
                      {log.details?.customerName && (
                        <span className="text-xs text-gray-400 block">
                          {log.details.customerName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.details?.endpoint ? (
                        <div className="max-w-xs">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded block truncate" title={log.details.endpoint}>
                            {log.details.endpoint}
                          </code>
                          {log.details.durationMs && (
                            <span className="text-xs text-gray-400">{log.details.durationMs}ms</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.details?.responseStatus ? (
                        <span className={`text-sm font-medium ${
                          log.details.responseStatus >= 200 && log.details.responseStatus < 300
                            ? 'text-green-600'
                            : log.details.responseStatus >= 400
                              ? 'text-red-600'
                              : 'text-yellow-600'
                        }`}>
                          {log.details.responseStatus}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                      {log.details?.error && (
                        <span className="text-xs text-red-500 block truncate max-w-[150px]" title={log.details.error}>
                          {log.details.error}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-600">
                Showing {filteredLogs.length} of {meta.total} logs
              </p>
              <div className="flex gap-2">
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
                  disabled={page >= meta.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
