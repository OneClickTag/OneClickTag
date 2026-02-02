'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/components/providers/auth-provider';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Star,
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

interface LeadDetail extends Lead {
  purpose: string;
  ipAddress: string | null;
  userAgent: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  responses: Array<{
    id: string;
    answer: string | string[] | number;
    question: {
      id: string;
      question: string;
      type: string;
      options: string[] | null;
      category: string | null;
    };
    createdAt: string;
  }>;
  pageViews: Array<{
    id: string;
    path: string;
    referrer: string | null;
    createdAt: string;
  }>;
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

interface AnswerBreakdown {
  option: string;
  count: number;
  percentage: number;
}

interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

interface QuestionAnalytics {
  questionId: string;
  question: string;
  type: string;
  category: string | null;
  totalResponses: number;
  options?: string[];
  answerBreakdown?: AnswerBreakdown[];
  averageRating?: number;
  ratingDistribution?: RatingDistribution[];
  sampleResponses?: (string | number | string[])[];
}

interface ResponseAnalytics {
  overview: {
    totalLeads: number;
    completedLeads: number;
    completionRate: number;
  };
  questions: QuestionAnalytics[];
}

type SortField = 'name' | 'email' | 'createdAt' | 'source';
type SortOrder = 'asc' | 'desc';

export default function AdminLeadsPage() {
  const api = useApi();
  const { getToken } = useAuth();
  const [search, setSearch] = useState('');
  const [questionnaireFilter, setQuestionnaireFilter] = useState<string>('all');
  const [marketingFilter, setMarketingFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Fetch response analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['admin', 'leads', 'response-analytics'],
    queryFn: () => api.get<ResponseAnalytics>('/api/admin/leads/response-analytics'),
  });

  // Fetch lead details when modal opens
  const { data: leadDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin', 'lead', selectedLeadId],
    queryFn: () => api.get<LeadDetail>(`/api/admin/leads/${selectedLeadId}`),
    enabled: !!selectedLeadId && isModalOpen,
  });

  const handleOpenLeadModal = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLeadId(null);
  };

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

  const handleExport = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/leads/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [getToken]);

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

      {/* Questionnaire Response Analytics */}
      {analyticsData && analyticsData.questions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Questionnaire Response Analytics</h3>
              <span className="text-sm text-gray-500">
                ({analyticsData.overview.completionRate}% completion rate)
              </span>
            </div>
            {showAnalytics ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {showAnalytics && (
            <div className="p-4 pt-0 space-y-6">
              {analyticsData.questions.map((question) => (
                <div key={question.questionId} className="border-t pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{question.question}</p>
                      <p className="text-sm text-gray-500">
                        {question.totalResponses} responses
                        {question.category && ` • ${question.category}`}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                      {question.type}
                    </span>
                  </div>

                  {/* RADIO/CHECKBOX - Bar chart visualization */}
                  {question.answerBreakdown && (
                    <div className="space-y-2">
                      {question.answerBreakdown.map((item) => (
                        <div key={item.option} className="flex items-center gap-3">
                          <div className="w-32 text-sm text-gray-700 truncate" title={item.option}>
                            {item.option}
                          </div>
                          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <div className="w-16 text-sm text-gray-600 text-right">
                            {item.count} ({item.percentage}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* RATING - Stars visualization */}
                  {question.ratingDistribution && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl font-bold text-yellow-500">
                          {question.averageRating}
                        </span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= Math.round(question.averageRating || 0)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">average rating</span>
                      </div>
                      {question.ratingDistribution.map((item) => (
                        <div key={item.rating} className="flex items-center gap-3">
                          <div className="w-12 text-sm text-gray-700 flex items-center gap-1">
                            {item.rating} <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          </div>
                          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 rounded-full transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <div className="w-16 text-sm text-gray-600 text-right">
                            {item.count} ({item.percentage}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TEXT/TEXTAREA - Sample responses */}
                  {question.sampleResponses && question.sampleResponses.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Sample responses:</p>
                      <div className="space-y-1">
                        {question.sampleResponses.map((response, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-gray-50 rounded text-sm text-gray-700 line-clamp-2"
                          >
                            {typeof response === 'string' ? response : JSON.stringify(response)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-blue-50"
                      onClick={() => handleOpenLeadModal(lead.id)}
                    >
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenLeadModal(lead.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
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

      {/* Lead Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setSelectedLeadId(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Lead Details
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : leadDetail ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{leadDetail.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{leadDetail.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Purpose</p>
                    <p className="font-medium">{leadDetail.purpose || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Source</p>
                    <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                      {leadDetail.source || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium">{new Date(leadDetail.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Marketing Consent</p>
                    <p className="font-medium flex items-center">
                      {leadDetail.marketingConsent ? (
                        <span className="flex items-center text-green-600">
                          <Check className="w-4 h-4 mr-1" /> Yes
                        </span>
                      ) : (
                        <span className="flex items-center text-gray-400">
                          <X className="w-4 h-4 mr-1" /> No
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* UTM Parameters */}
              {(leadDetail.utmSource || leadDetail.utmMedium || leadDetail.utmCampaign) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">UTM Parameters</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Source</p>
                      <p className="font-medium">{leadDetail.utmSource || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Medium</p>
                      <p className="font-medium">{leadDetail.utmMedium || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Campaign</p>
                      <p className="font-medium">{leadDetail.utmCampaign || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Questionnaire Responses */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Questionnaire Responses ({leadDetail.responses.length})
                </h4>
                {leadDetail.responses.length === 0 ? (
                  <p className="text-gray-500 text-sm">No questionnaire responses yet.</p>
                ) : (
                  <div className="space-y-4">
                    {leadDetail.responses.map((response) => (
                      <div key={response.id} className="border-l-2 border-blue-300 pl-4">
                        <p className="text-sm text-gray-500 mb-1">
                          {response.question.question}
                          {response.question.category && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {response.question.category}
                            </span>
                          )}
                        </p>
                        <div className="font-medium">
                          {response.question.type === 'RATING' ? (
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= Number(response.answer)
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-gray-600">({response.answer})</span>
                            </div>
                          ) : Array.isArray(response.answer) ? (
                            <div className="flex flex-wrap gap-1">
                              {response.answer.map((ans, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                                >
                                  {ans}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p>{String(response.answer)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Page Views */}
              {leadDetail.pageViews.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Page Views ({leadDetail.pageViews.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-gray-500">
                        <tr>
                          <th className="text-left py-1">Path</th>
                          <th className="text-left py-1">Referrer</th>
                          <th className="text-right py-1">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadDetail.pageViews.map((view) => (
                          <tr key={view.id} className="border-t">
                            <td className="py-1 font-medium">{view.path}</td>
                            <td className="py-1 text-gray-500 truncate max-w-[150px]">
                              {view.referrer || '-'}
                            </td>
                            <td className="py-1 text-right text-gray-500">
                              {new Date(view.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Technical Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Technical Info</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">IP Address</p>
                    <p className="font-mono">{leadDetail.ipAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">User Agent</p>
                    <p className="font-mono text-xs break-all">{leadDetail.userAgent || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Lead not found</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
