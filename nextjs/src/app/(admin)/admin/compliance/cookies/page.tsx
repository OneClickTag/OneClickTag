'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Cookie,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Loader2,
  Folder,
} from 'lucide-react';

interface CookieItem {
  id: string;
  name: string;
  purpose?: string;
  provider: string;
  duration: string;
  type?: string;
  categoryId: string;
  category?: { name: string };
  createdAt: string;
}

interface CookieCategory {
  id: string;
  name: string;
  description?: string;
  category: string;
  isRequired: boolean;
  cookies?: CookieItem[];
}

// Valid category types from Prisma enum
const CATEGORY_TYPES = [
  { value: 'NECESSARY', label: 'Necessary' },
  { value: 'ANALYTICS', label: 'Analytics' },
  { value: 'MARKETING', label: 'Marketing' },
];

export default function CookiesPage() {
  const api = useApi();
  const queryClient = useQueryClient();

  // Cookie state
  const [isCookieDialogOpen, setIsCookieDialogOpen] = useState(false);
  const [editingCookie, setEditingCookie] = useState<CookieItem | null>(null);
  const [cookieFormData, setCookieFormData] = useState({
    name: '',
    purpose: '',
    provider: '',
    duration: '',
    type: '',
    categoryId: '',
  });

  // Category state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CookieCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    category: 'NECESSARY',
    isRequired: false,
  });

  // Queries
  const { data: cookies = [], isLoading: cookiesLoading, refetch: refetchCookies } = useQuery({
    queryKey: ['compliance', 'cookies'],
    queryFn: () => api.get<CookieItem[]>('/api/compliance/cookies'),
  });

  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['compliance', 'cookie-categories'],
    queryFn: () => api.get<CookieCategory[]>('/api/compliance/cookie-categories'),
  });

  // Cookie mutations
  const createCookieMutation = useMutation({
    mutationFn: (data: typeof cookieFormData) =>
      api.post('/api/compliance/cookies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'cookies'] });
      setIsCookieDialogOpen(false);
      resetCookieForm();
    },
    onError: (error: Error) => {
      alert(`Error creating cookie: ${error.message}`);
    },
  });

  const updateCookieMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof cookieFormData) =>
      api.patch(`/api/compliance/cookies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'cookies'] });
      setIsCookieDialogOpen(false);
      resetCookieForm();
    },
    onError: (error: Error) => {
      alert(`Error updating cookie: ${error.message}`);
    },
  });

  const deleteCookieMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/compliance/cookies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'cookies'] });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: typeof categoryFormData) =>
      api.post('/api/compliance/cookie-categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'cookie-categories'] });
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error: Error) => {
      alert(`Error creating category: ${error.message}`);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof categoryFormData) =>
      api.put(`/api/compliance/cookie-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'cookie-categories'] });
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error: Error) => {
      alert(`Error updating category: ${error.message}`);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/compliance/cookie-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'cookie-categories'] });
    },
  });

  // Cookie handlers
  const resetCookieForm = () => {
    setCookieFormData({ name: '', purpose: '', provider: '', duration: '', type: '', categoryId: '' });
    setEditingCookie(null);
  };

  const handleEditCookie = (cookie: CookieItem) => {
    setEditingCookie(cookie);
    setCookieFormData({
      name: cookie.name,
      purpose: cookie.purpose || '',
      provider: cookie.provider,
      duration: cookie.duration,
      type: cookie.type || '',
      categoryId: cookie.categoryId,
    });
    setIsCookieDialogOpen(true);
  };

  const handleCookieSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cookieFormData.categoryId) {
      alert('Please select a category. You need to create a category first if none exist.');
      return;
    }
    if (editingCookie) {
      updateCookieMutation.mutate({ id: editingCookie.id, ...cookieFormData });
    } else {
      createCookieMutation.mutate(cookieFormData);
    }
  };

  const handleDeleteCookie = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cookie?')) return;
    await deleteCookieMutation.mutateAsync(id);
  };

  // Category handlers
  const resetCategoryForm = () => {
    setCategoryFormData({ name: '', description: '', category: 'NECESSARY', isRequired: false });
    setEditingCategory(null);
  };

  const handleEditCategory = (category: CookieCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      category: category.category,
      isRequired: category.isRequired,
    });
    setIsCategoryDialogOpen(true);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, ...categoryFormData });
    } else {
      createCategoryMutation.mutate(categoryFormData);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? All cookies in this category will also be affected.')) return;
    await deleteCategoryMutation.mutateAsync(id);
  };

  const categoriesArray = Array.isArray(categories) ? categories : [];
  const cookiesArray = Array.isArray(cookies) ? cookies : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cookie Management</h2>
          <p className="text-gray-600 mt-1">Manage cookie categories and individual cookies</p>
        </div>
        <Button variant="outline" onClick={() => { refetchCookies(); refetchCategories(); }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">
            <Folder className="w-4 h-4 mr-2" />
            Categories ({categoriesArray.length})
          </TabsTrigger>
          <TabsTrigger value="cookies">
            <Cookie className="w-4 h-4 mr-2" />
            Cookies ({cookiesArray.length})
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetCategoryForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                      placeholder="e.g., Analytics Cookies"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryType">Category Type</Label>
                    <Select
                      value={categoryFormData.category}
                      onValueChange={(value) => setCategoryFormData({ ...categoryFormData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="categoryDescription">Description</Label>
                    <Textarea
                      id="categoryDescription"
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                      placeholder="Describe what cookies in this category are used for..."
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isRequired"
                      checked={categoryFormData.isRequired}
                      onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, isRequired: checked })}
                    />
                    <Label htmlFor="isRequired">Required (cannot be disabled by users)</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                      {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {editingCategory ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {categoriesLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="text-gray-600 mt-2">Loading categories...</p>
              </div>
            ) : categoriesArray.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No cookie categories yet</p>
                <p className="text-sm text-gray-500 mt-1">Create a category first before adding cookies</p>
                <Button className="mt-4" onClick={() => setIsCategoryDialogOpen(true)}>
                  Create First Category
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Cookies</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesArray.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{category.name}</span>
                          {category.description && (
                            <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          {category.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        {category.isRequired ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </TableCell>
                      <TableCell>{category.cookies?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditCategory(category)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={deleteCategoryMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Cookies Tab */}
        <TabsContent value="cookies" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCookieDialogOpen} onOpenChange={setIsCookieDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetCookieForm} disabled={categoriesArray.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Cookie
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCookie ? 'Edit Cookie' : 'Add New Cookie'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCookieSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Cookie Name</Label>
                    <Input
                      id="name"
                      value={cookieFormData.name}
                      onChange={(e) => setCookieFormData({ ...cookieFormData, name: e.target.value })}
                      placeholder="_ga, _fbp, etc."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="purpose">Purpose</Label>
                    <Textarea
                      id="purpose"
                      value={cookieFormData.purpose}
                      onChange={(e) => setCookieFormData({ ...cookieFormData, purpose: e.target.value })}
                      placeholder="What this cookie is used for..."
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <Label htmlFor="provider">Provider</Label>
                      <Input
                        id="provider"
                        value={cookieFormData.provider}
                        onChange={(e) => setCookieFormData({ ...cookieFormData, provider: e.target.value })}
                        placeholder="Google, Facebook, etc."
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Input
                        id="duration"
                        value={cookieFormData.duration}
                        onChange={(e) => setCookieFormData({ ...cookieFormData, duration: e.target.value })}
                        placeholder="2 years, 1 session, etc."
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={cookieFormData.type}
                        onValueChange={(value) => setCookieFormData({ ...cookieFormData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="persistent">Persistent</SelectItem>
                          <SelectItem value="session">Session</SelectItem>
                          <SelectItem value="first-party">First Party</SelectItem>
                          <SelectItem value="third-party">Third Party</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="categoryId">Category *</Label>
                      <Select
                        value={cookieFormData.categoryId}
                        onValueChange={(value) => setCookieFormData({ ...cookieFormData, categoryId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriesArray.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCookieDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createCookieMutation.isPending || updateCookieMutation.isPending}>
                      {(createCookieMutation.isPending || updateCookieMutation.isPending) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {editingCookie ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {cookiesLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="text-gray-600 mt-2">Loading cookies...</p>
              </div>
            ) : categoriesArray.length === 0 ? (
              <div className="text-center py-12">
                <Cookie className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Create a category first</p>
                <p className="text-sm text-gray-500 mt-1">You need at least one category before adding cookies</p>
              </div>
            ) : cookiesArray.length === 0 ? (
              <div className="text-center py-12">
                <Cookie className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No cookies declared yet</p>
                <Button className="mt-4" onClick={() => setIsCookieDialogOpen(true)}>
                  Declare First Cookie
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cookiesArray.map((cookie) => (
                    <TableRow key={cookie.id}>
                      <TableCell>
                        <div>
                          <code className="font-medium">{cookie.name}</code>
                          {cookie.purpose && (
                            <p className="text-xs text-gray-500 mt-1">{cookie.purpose}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{cookie.provider}</TableCell>
                      <TableCell>{cookie.duration}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {cookie.category?.name || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditCookie(cookie)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCookie(cookie.id)}
                            disabled={deleteCookieMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
