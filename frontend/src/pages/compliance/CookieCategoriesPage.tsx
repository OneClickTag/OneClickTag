import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, RefreshCw, Edit2 } from 'lucide-react';
import { adminComplianceService, CookieCategory, CookieConsentCategory, CreateCookieCategoryData, UpdateCookieCategoryData } from '@/lib/api/services/admin';

export function CookieCategoriesPage() {
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<CookieCategory | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<CreateCookieCategoryData>({
    category: 'ANALYTICS',
    name: '',
    description: '',
    isRequired: false,
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await adminComplianceService.getCookieCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to fetch cookie categories:', error);
      setMessage({ type: 'error', text: 'Failed to load cookie categories' });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (cat?: CookieCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        category: cat.category,
        name: cat.name,
        description: cat.description,
        isRequired: cat.isRequired,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        category: 'ANALYTICS',
        name: '',
        description: '',
        isRequired: false,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      category: 'ANALYTICS',
      name: '',
      description: '',
      isRequired: false,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMessage(null);
      if (editingCategory) {
        await adminComplianceService.updateCookieCategory(editingCategory.id, formData as UpdateCookieCategoryData);
        setMessage({ type: 'success', text: 'Cookie category updated successfully!' });
      } else {
        await adminComplianceService.createCookieCategory(formData);
        setMessage({ type: 'success', text: 'Cookie category created successfully!' });
      }
      handleCloseModal();
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to save cookie category:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to save cookie category'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cookie category?')) return;

    try {
      await adminComplianceService.deleteCookieCategory(id);
      setMessage({ type: 'success', text: 'Cookie category deleted successfully!' });
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to delete cookie category:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to delete cookie category'
      });
    }
  };

  const updateFormData = (field: keyof CreateCookieCategoryData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cookie Categories</h2>
            <p className="text-gray-600 mt-1">Manage cookie categories for consent banner</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchCategories} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <Button onClick={() => handleOpenModal()} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
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

        {/* Categories Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading cookie categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No cookie categories found</p>
              <Button onClick={() => handleOpenModal()} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add First Category
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Required
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{cat.category}</code>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{cat.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cat.description}</td>
                      <td className="px-6 py-4 text-sm">
                        {cat.isRequired ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Required
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Optional
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(cat)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          <Edit2 className="w-4 h-4 inline mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
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

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Cookie categories help users understand and manage their consent preferences.
            Necessary cookies should be marked as required. Display order determines how categories appear in the consent banner.
          </p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingCategory ? 'Edit Cookie Category' : 'Add Cookie Category'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => updateFormData('category', e.target.value as CookieConsentCategory)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NECESSARY">Necessary</option>
                    <option value="ANALYTICS">Analytics</option>
                    <option value="MARKETING">Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="Necessary Cookies"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="These cookies are essential for the website to function properly"
                  rows={3}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={formData.isRequired}
                  onChange={(e) => updateFormData('isRequired', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="isRequired" className="ml-2 text-sm text-gray-700">
                  Required (users cannot opt out)
                </label>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
