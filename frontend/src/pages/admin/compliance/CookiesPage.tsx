import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Pencil, Trash2, RefreshCw, Cookie as CookieIcon, Search } from 'lucide-react';
import {
  adminComplianceService,
  Cookie,
  CookieCategory,
  CreateCookieData,
  UpdateCookieData,
  CookieQueryParams,
} from '@/lib/api/services/admin/adminComplianceService';

export function CookiesPage() {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCookie, setEditingCookie] = useState<Cookie | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cookieToDelete, setCookieToDelete] = useState<Cookie | null>(null);
  const [selectedCookies, setSelectedCookies] = useState<Set<string>>(new Set());

  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  const [formData, setFormData] = useState<CreateCookieData>({
    name: '',
    provider: '',
    purpose: '',
    duration: '',
    categoryId: '',
  });

  const fetchCookies = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const params: CookieQueryParams = {
        page: currentPage,
        limit: 10,
      };

      if (searchTerm) params.search = searchTerm;
      if (filterCategory) params.categoryId = filterCategory;

      const response = await adminComplianceService.getCookies(params);
      setCookies(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (error: any) {
      console.error('Failed to fetch cookies:', error);
      setMessage({ type: 'error', text: 'Failed to load cookies' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await adminComplianceService.getCookieCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCookies();
  }, [currentPage, searchTerm, filterCategory]);

  const handleOpenDialog = (cookie?: Cookie) => {
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
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCookie(null);
    setFormData({
      name: '',
      provider: '',
      purpose: '',
      duration: '',
      categoryId: '',
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      if (editingCookie) {
        await adminComplianceService.updateCookie(editingCookie.id, formData as UpdateCookieData);
        setMessage({ type: 'success', text: 'Cookie updated successfully!' });
      } else {
        await adminComplianceService.createCookie(formData);
        setMessage({ type: 'success', text: 'Cookie created successfully!' });
      }

      handleCloseDialog();
      fetchCookies();
    } catch (error: any) {
      console.error('Failed to save cookie:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to save cookie',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!cookieToDelete) return;

    try {
      setMessage(null);
      await adminComplianceService.deleteCookie(cookieToDelete.id);
      setMessage({ type: 'success', text: 'Cookie deleted successfully!' });
      setDeleteConfirmOpen(false);
      setCookieToDelete(null);
      fetchCookies();
    } catch (error: any) {
      console.error('Failed to delete cookie:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to delete cookie',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCookies.size === 0) return;

    try {
      setMessage(null);
      await adminComplianceService.bulkDeleteCookies(Array.from(selectedCookies));
      setMessage({ type: 'success', text: `${selectedCookies.size} cookies deleted successfully!` });
      setSelectedCookies(new Set());
      fetchCookies();
    } catch (error: any) {
      console.error('Failed to bulk delete cookies:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to delete cookies',
      });
    }
  };

  const toggleCookieSelection = (cookieId: string) => {
    const newSelection = new Set(selectedCookies);
    if (newSelection.has(cookieId)) {
      newSelection.delete(cookieId);
    } else {
      newSelection.add(cookieId);
    }
    setSelectedCookies(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedCookies.size === cookies.length) {
      setSelectedCookies(new Set());
    } else {
      setSelectedCookies(new Set(cookies.map((c) => c.id)));
    }
  };

  const updateFormData = (field: keyof CreateCookieData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading && currentPage === 1) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading cookies...</p>
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
            <h2 className="text-2xl font-bold text-gray-900">Cookies</h2>
            <p className="text-gray-600 mt-1">Manage cookies used on your website</p>
          </div>
          <div className="flex space-x-2">
            {selectedCookies.size > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                className="flex items-center space-x-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete ({selectedCookies.size})</span>
              </Button>
            )}
            <Button variant="outline" onClick={fetchCookies} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <Button onClick={() => handleOpenDialog()} className="flex items-center space-x-2">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  placeholder="Search cookies..."
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category">Filter by Category</Label>
              <Select
                value={filterCategory}
                onValueChange={(value) => {
                  setFilterCategory(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Cookies List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {cookies.length === 0 ? (
            <div className="p-12 text-center">
              <CookieIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No cookies found</p>
              <Button onClick={() => handleOpenDialog()}>Create First Cookie</Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <Checkbox checked={selectedCookies.size === cookies.length} onCheckedChange={toggleSelectAll} />
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cookies.map((cookie) => (
                      <tr key={cookie.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Checkbox
                            checked={selectedCookies.has(cookie.id)}
                            onCheckedChange={() => toggleCookieSelection(cookie.id)}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          <div>
                            <div className="font-medium">{cookie.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{cookie.purpose}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{cookie.provider}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {cookie.category?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{cookie.duration}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(cookie)}
                            className="inline-flex items-center space-x-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCookieToDelete(cookie);
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
            <strong>Tip:</strong> Document all cookies used on your website for GDPR compliance. Include the cookie
            name, provider, purpose, and duration. Users can accept or decline cookies based on their category.
          </p>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCookie ? 'Edit Cookie' : 'Create Cookie'}</DialogTitle>
            <DialogDescription>
              {editingCookie
                ? 'Update the cookie information below.'
                : 'Add a new cookie to your compliance documentation.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Cookie Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="_ga"
                />
              </div>
              <div>
                <Label htmlFor="provider">Provider *</Label>
                <Input
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => updateFormData('provider', e.target.value)}
                  placeholder="Google Analytics"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="purpose">Purpose *</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) => updateFormData('purpose', e.target.value)}
                placeholder="Used to distinguish users and track website usage..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => updateFormData('duration', e.target.value)}
                  placeholder="2 years"
                />
              </div>
              <div>
                <Label htmlFor="categoryId">Category *</Label>
                <Select value={formData.categoryId} onValueChange={(value) => updateFormData('categoryId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingCookie ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cookie</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the cookie "{cookieToDelete?.name}"? This action cannot be undone.
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
