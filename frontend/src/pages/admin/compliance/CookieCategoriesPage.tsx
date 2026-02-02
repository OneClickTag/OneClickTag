import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Pencil, Trash2, RefreshCw, FolderTree } from 'lucide-react';
import {
  adminComplianceService,
  CookieCategory,
  CookieConsentCategory,
  CreateCookieCategoryData,
  UpdateCookieCategoryData,
} from '@/lib/api/services/admin/adminComplianceService';

export function CookieCategoriesPage() {
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CookieCategory | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CookieCategory | null>(null);

  const [formData, setFormData] = useState<CreateCookieCategoryData>({
    category: 'ANALYTICS',
    name: '',
    description: '',
    isRequired: false,
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await adminComplianceService.getCookieCategories();
      // Sort by category type: NECESSARY first, then ANALYTICS, then MARKETING
      const categoryOrder: Record<CookieConsentCategory, number> = {
        NECESSARY: 0,
        ANALYTICS: 1,
        MARKETING: 2,
      };
      setCategories(data.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]));
    } catch (error: any) {
      console.error('Failed to fetch cookie categories:', error);
      setMessage({ type: 'error', text: 'Failed to load cookie categories' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenDialog = (category?: CookieCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        category: category.category,
        name: category.name,
        description: category.description,
        isRequired: category.isRequired,
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
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      category: 'ANALYTICS',
      name: '',
      description: '',
      isRequired: false,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      if (editingCategory) {
        await adminComplianceService.updateCookieCategory(editingCategory.id, formData as UpdateCookieCategoryData);
        setMessage({ type: 'success', text: 'Category updated successfully!' });
      } else {
        await adminComplianceService.createCookieCategory(formData);
        setMessage({ type: 'success', text: 'Category created successfully!' });
      }

      handleCloseDialog();
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to save category',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setMessage(null);
      await adminComplianceService.deleteCookieCategory(categoryToDelete.id);
      setMessage({ type: 'success', text: 'Category deleted successfully!' });
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to delete category',
      });
    }
  };

  const updateFormData = (field: keyof CreateCookieCategoryData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading cookie categories...</p>
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
            <h2 className="text-2xl font-bold text-gray-900">Cookie Categories</h2>
            <p className="text-gray-600 mt-1">Manage cookie categories for consent management</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchCategories} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <Button onClick={() => handleOpenDialog()} className="flex items-center space-x-2">
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

        {/* Categories List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {categories.length === 0 ? (
            <div className="p-12 text-center">
              <FolderTree className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No cookie categories found</p>
              <Button onClick={() => handleOpenDialog()}>Create First Category</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category Type
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Required
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{category.category}</code>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">{category.description}</td>
                      <td className="px-6 py-4 text-sm">
                        {category.isRequired ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Optional
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(category)}
                          className="inline-flex items-center space-x-1"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCategoryToDelete(category);
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
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Cookie categories organize cookies by purpose (e.g., Essential, Analytics,
            Marketing). Required categories cannot be declined by users. Display order determines the order shown in
            the consent banner.
          </p>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Cookie Category' : 'Create Cookie Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the cookie category information below.'
                : 'Add a new cookie category for organizing cookies.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category Type *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => updateFormData('category', value as CookieConsentCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NECESSARY">Necessary</SelectItem>
                    <SelectItem value="ANALYTICS">Analytics</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Essential Cookies"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="These cookies are necessary for the website to function..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) => updateFormData('isRequired', checked)}
              />
              <Label htmlFor="isRequired" className="cursor-pointer">
                Required (cannot be declined)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cookie Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"? This action cannot be undone.
              All cookies in this category will need to be reassigned.
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
