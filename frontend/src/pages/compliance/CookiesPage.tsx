import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, RefreshCw, Edit2, Search } from 'lucide-react';
import { adminComplianceService, Cookie, CookieCategory, CreateCookieData, UpdateCookieData } from '@/lib/api/services/admin';

export function CookiesPage() {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCookie, setEditingCookie] = useState<Cookie | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedCookies, setSelectedCookies] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState<CreateCookieData>({
    name: '',
    provider: '',
    purpose: '',
    duration: '',
    categoryId: '',
  });

  const fetchCategories = async () => {
    try {
      const data = await adminComplianceService.getCookieCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to fetch cookie categories:', error);
      setCategories([]);
    }
  };

  const fetchCookies = async () => {
    try {
      setLoading(true);
      const response = await adminComplianceService.getCookies({
        page,
        limit: 20,
        categoryId: filterCategory || undefined,
        search: searchTerm || undefined,
      });
      setCookies(Array.isArray(response.data) ? response.data : []);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (error: any) {
      console.error('Failed to fetch cookies:', error);
      setMessage({ type: 'error', text: 'Failed to load cookies' });
      setCookies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCookies();
  }, [page, filterCategory, searchTerm]);

  const handleOpenModal = (cookie?: Cookie) => {
    if (cookie) {
      setEditingCookie(cookie);
      setFormData({
        name: cookie.name,
        provider: cookie.provider,
        purpose: cookie.purpose,
        duration: cookie.duration,
        categoryId: cookie.categoryId,
      });
    } else {
      setEditingCookie(null);
      setFormData({
        name: '',
        provider: '',
        purpose: '',
        duration: '',
        categoryId: categories[0]?.id || '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCookie(null);
    setFormData({
      name: '',
      provider: '',
      purpose: '',
      duration: '',
      categoryId: '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMessage(null);
      if (editingCookie) {
        await adminComplianceService.updateCookie(editingCookie.id, formData as UpdateCookieData);
        setMessage({ type: 'success', text: 'Cookie updated successfully!' });
      } else {
        await adminComplianceService.createCookie(formData);
        setMessage({ type: 'success', text: 'Cookie created successfully!' });
      }
      handleCloseModal();
      fetchCookies();
    } catch (error: any) {
      console.error('Failed to save cookie:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to save cookie'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cookie?')) return;

    try {
      await adminComplianceService.deleteCookie(id);
      setMessage({ type: 'success', text: 'Cookie deleted successfully!' });
      fetchCookies();
    } catch (error: any) {
      console.error('Failed to delete cookie:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to delete cookie'
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCookies.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedCookies.size} cookies?`)) return;

    try {
      await adminComplianceService.bulkDeleteCookies(Array.from(selectedCookies));
      setMessage({ type: 'success', text: 'Cookies deleted successfully!' });
      setSelectedCookies(new Set());
      fetchCookies();
    } catch (error: any) {
      console.error('Failed to delete cookies:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to delete cookies'
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedCookies.size === cookies.length) {
      setSelectedCookies(new Set());
    } else {
      setSelectedCookies(new Set(cookies.map(c => c.id)));
    }
  };

  const handleSelectCookie = (id: string) => {
    const newSelected = new Set(selectedCookies);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCookies(newSelected);
  };

  const updateFormData = (field: keyof CreateCookieData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cookies</h2>
            <p className="text-gray-600 mt-1">Manage individual cookies used on your website</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchCookies} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <Button onClick={() => handleOpenModal()} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Cookie</span>
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Actions */}
        {selectedCookies.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-blue-900 font-medium">
              {selectedCookies.size} cookie{selectedCookies.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="flex items-center space-x-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected</span>
            </Button>
          </div>
        )}

        {/* Cookies Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading cookies...</p>
            </div>
          ) : cookies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No cookies found</p>
              <Button onClick={() => handleOpenModal()} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add First Cookie
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCookies.size === cookies.length && cookies.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cookies.map((cookie) => (
                    <tr key={cookie.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCookies.has(cookie.id)}
                          onChange={() => handleSelectCookie(cookie.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{cookie.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cookie.provider}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{cookie.purpose}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cookie.duration}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cookie.category?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(cookie)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          <Edit2 className="w-4 h-4 inline mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cookie.id)}
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingCookie ? 'Edit Cookie' : 'Add Cookie'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="_ga"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={(e) => updateFormData('provider', e.target.value)}
                    placeholder="Google Analytics"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => updateFormData('purpose', e.target.value)}
                  placeholder="Used to distinguish users and track website usage"
                  rows={3}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => updateFormData('duration', e.target.value)}
                    placeholder="2 years"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => updateFormData('categoryId', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCookie ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
