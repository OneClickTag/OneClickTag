import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Search, Users, BarChart3, Mail, Cookie } from 'lucide-react';
import {
  adminComplianceService,
  UserConsent,
  ConsentStats,
  UserConsentQueryParams,
} from '@/lib/api/services/admin/adminComplianceService';

export function UserConsentsPage() {
  const [consents, setConsents] = useState<UserConsent[]>([]);
  const [stats, setStats] = useState<ConsentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnalytics, setFilterAnalytics] = useState<string>('');
  const [filterMarketing, setFilterMarketing] = useState<string>('');
  const [filterNewsletter, setFilterNewsletter] = useState<string>('');

  const fetchConsents = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const params: UserConsentQueryParams = {
        page: currentPage,
        limit: 20,
      };

      if (searchTerm) params.search = searchTerm;
      if (filterAnalytics === 'true') params.analyticsCookies = true;
      if (filterAnalytics === 'false') params.analyticsCookies = false;
      if (filterMarketing === 'true') params.marketingCookies = true;
      if (filterMarketing === 'false') params.marketingCookies = false;
      if (filterNewsletter === 'true') params.newsletterConsent = true;
      if (filterNewsletter === 'false') params.newsletterConsent = false;

      const response = await adminComplianceService.getUserConsents(params);
      setConsents(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error: any) {
      console.error('Failed to fetch user consents:', error);
      setMessage({ type: 'error', text: 'Failed to load user consents' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await adminComplianceService.getConsentStats();
      setStats(data);
    } catch (error: any) {
      console.error('Failed to fetch consent stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchConsents();
  }, [currentPage, searchTerm, filterAnalytics, filterMarketing, filterNewsletter]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterAnalytics('');
    setFilterMarketing('');
    setFilterNewsletter('');
    setCurrentPage(1);
  };

  if (loading && currentPage === 1 && !stats) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading user consents...</p>
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
            <h2 className="text-2xl font-bold text-gray-900">User Consents</h2>
            <p className="text-gray-600 mt-1">View and filter cookie and newsletter consent records</p>
          </div>
          <Button variant="outline" onClick={() => { fetchConsents(); fetchStats(); }} className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Consents</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Analytics Consent</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.analytics.rate}%</p>
                  <p className="text-xs text-gray-400">{stats.analytics.accepted} accepted</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Cookie className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Marketing Consent</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.marketing.rate}%</p>
                  <p className="text-xs text-gray-400">{stats.marketing.accepted} accepted</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Mail className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Newsletter Subscribers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.newsletter.rate}%</p>
                  <p className="text-xs text-gray-400">{stats.newsletter.subscribed} subscribed</p>
                </div>
              </div>
            </div>
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by email or ID..."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="analytics">Analytics Cookies</Label>
              <Select
                value={filterAnalytics}
                onValueChange={(value) => {
                  setFilterAnalytics(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="true">Accepted</SelectItem>
                  <SelectItem value="false">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="marketing">Marketing Cookies</Label>
              <Select
                value={filterMarketing}
                onValueChange={(value) => {
                  setFilterMarketing(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="true">Accepted</SelectItem>
                  <SelectItem value="false">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="newsletter">Newsletter</Label>
              <Select
                value={filterNewsletter}
                onValueChange={(value) => {
                  setFilterNewsletter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="true">Subscribed</SelectItem>
                  <SelectItem value="false">Not Subscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters} className="w-full">
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Consents Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {consents.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No consent records found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User / Anonymous ID
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Analytics
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marketing
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Newsletter
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Consent Date
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {consents.map((consent) => (
                      <tr key={consent.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            {consent.user ? (
                              <>
                                <div className="font-medium text-gray-900">{consent.user.name || consent.user.email}</div>
                                <div className="text-xs text-gray-500">{consent.user.email}</div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium text-gray-500">Anonymous</div>
                                <div className="text-xs text-gray-400 font-mono">{consent.anonymousId?.slice(0, 8)}...</div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              consent.analyticsCookies
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {consent.analyticsCookies ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              consent.marketingCookies
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {consent.marketingCookies ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              consent.newsletterConsent
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {consent.newsletterConsent ? 'Subscribed' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(consent.consentGivenAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(consent.consentExpiresAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
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
                    Page {currentPage} of {totalPages} ({total} total)
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
            <strong>Tip:</strong> This page shows all cookie consent and newsletter subscription records.
            Use the filters to find users who have accepted specific consent types or subscribed to the newsletter.
            All consent data is stored in the database for GDPR compliance.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
