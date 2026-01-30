'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
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
import {
  BarChart3,
  Search,
  RefreshCw,
  Download,
  Check,
  X,
  Loader2,
  Mail,
  MailX,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  source: string;
  questionnaireCompleted: boolean;
  marketingConsent: boolean;
  marketingConsentAt: string | null;
  acceptedTerms: boolean;
  acceptedTermsAt: string | null;
  responseCount: number;
  createdAt: string;
}

interface LeadsResponse {
  data: Lead[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type SortField = 'name' | 'email' | 'createdAt' | 'source';
type SortOrder = 'asc' | 'desc';

export default function AdminLeadsPage() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [questionnaireFilter, setQuestionnaireFilter] = useState<string>('all');
  const [marketingFilter, setMarketingFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'leads', page, search, questionnaireFilter, marketingFilter, sourceFilter, sortBy, sortOrder],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      if (search) params.set('search', search);
      if (questionnaireFilter !== 'all') {
        params.set('questionnaireCompleted', questionnaireFilter);
      }
      if (marketingFilter !== 'all') {
        params.set('marketingConsent', marketingFilter);
      }
      if (sourceFilter !== 'all') {
        params.set('source', sourceFilter);
      }
      return api.get<LeadsResponse>(`/api/admin/leads?${params.toString()}`);
    },
  });

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/leads/export', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
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

  const leads = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  // Get unique sources for filter
  const uniqueSources = Array.from(new Set(leads.map(l => l.source).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
          <p className="text-gray-600 mt-1">Manage early access signups and questionnaire responses</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={questionnaireFilter}
            onValueChange={(value) => {
              setQuestionnaireFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Questionnaire Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Questionnaire</SelectItem>
              <SelectItem value="true">Completed</SelectItem>
              <SelectItem value="false">Not Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={marketingFilter}
            onValueChange={(value) => {
              setMarketingFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Marketing Consent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Marketing</SelectItem>
              <SelectItem value="true">Opted In</SelectItem>
              <SelectItem value="false">Opted Out</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sourceFilter}
            onValueChange={(value) => {
              setSourceFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="early-access">Early Access</SelectItem>
              <SelectItem value="landing">Landing</SelectItem>
              <SelectItem value="hero">Hero</SelectItem>
              <SelectItem value="cta">CTA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      {!isLoading && leads.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900">{meta.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Questionnaire Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {leads.filter(l => l.questionnaireCompleted).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Marketing Opt-ins</p>
            <p className="text-2xl font-bold text-blue-600">
              {leads.filter(l => l.marketingConsent).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">This Page</p>
            <p className="text-2xl font-bold text-gray-700">{leads.length}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Loading leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No leads found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Name
                        {getSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        Email
                        {getSortIcon('email')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('source')}
                    >
                      <div className="flex items-center">
                        Source
                        {getSortIcon('source')}
                      </div>
                    </TableHead>
                    <TableHead>Questionnaire</TableHead>
                    <TableHead>Marketing</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        Created
                        {getSortIcon('createdAt')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {lead.source || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {lead.questionnaireCompleted ? (
                          <span className="flex items-center text-green-600">
                            <Check className="w-4 h-4 mr-1" />
                            Completed
                          </span>
                        ) : (
                          <span className="flex items-center text-gray-400">
                            <X className="w-4 h-4 mr-1" />
                            Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.marketingConsent ? (
                          <span className="flex items-center text-blue-600" title={lead.marketingConsentAt ? `Opted in: ${new Date(lead.marketingConsentAt).toLocaleString()}` : ''}>
                            <Mail className="w-4 h-4 mr-1" />
                            Opted In
                          </span>
                        ) : (
                          <span className="flex items-center text-gray-400">
                            <MailX className="w-4 h-4 mr-1" />
                            Opted Out
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{lead.responseCount}</TableCell>
                      <TableCell className="text-gray-600">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-600">
                Showing {leads.length} of {meta.total} leads (Page {meta.page} of {meta.totalPages})
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
                  disabled={page >= meta.totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(meta.totalPages)}
                  disabled={page >= meta.totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
