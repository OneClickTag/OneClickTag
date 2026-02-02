'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';

interface ContentPage {
  id: string;
  title: string;
  slug: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  updatedAt: string;
}

interface PageFormData {
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
}

const initialFormData: PageFormData = {
  title: '',
  slug: '',
  content: '',
  metaTitle: '',
  metaDescription: '',
  isPublished: false,
};

export default function AdminContentPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<ContentPage | null>(null);
  const [formData, setFormData] = useState<PageFormData>(initialFormData);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'content'],
    queryFn: () => api.get<ContentPage[]>('/api/admin/content-pages'),
  });

  const pages = Array.isArray(data) ? data : [];

  const togglePublishMutation = useMutation({
    mutationFn: ({
      pageId,
      isPublished,
    }: {
      pageId: string;
      isPublished: boolean;
    }) =>
      api.patch(`/api/admin/content-pages/${pageId}/publish`, { isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (pageId: string) => api.delete(`/api/admin/content-pages/${pageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: PageFormData) => api.post('/api/admin/content-pages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PageFormData> }) =>
      api.put(`/api/admin/content-pages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
      handleCloseModal();
    },
  });

  useEffect(() => {
    if (isModalOpen && editingPage) {
      setFormData({
        title: editingPage.title || '',
        slug: editingPage.slug || '',
        content: editingPage.content || '',
        metaTitle: editingPage.metaTitle || '',
        metaDescription: editingPage.metaDescription || '',
        isPublished: editingPage.isPublished ?? false,
      });
    } else if (isModalOpen && !editingPage) {
      setFormData(initialFormData);
    }
  }, [isModalOpen, editingPage]);

  const handleOpenCreateModal = () => {
    setEditingPage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (page: ContentPage) => {
    setEditingPage(page);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPage(null);
    setFormData(initialFormData);
  };

  const handleSavePage = async () => {
    if (!formData.title.trim() || !formData.slug.trim()) {
      alert('Title and slug are required');
      return;
    }

    try {
      if (editingPage) {
        await updateMutation.mutateAsync({ id: editingPage.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Failed to save page:', error);
      alert('Failed to save page. Please try again.');
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTogglePublish = async (
    pageId: string,
    currentStatus: boolean
  ) => {
    try {
      await togglePublishMutation.mutateAsync({
        pageId,
        isPublished: !currentStatus,
      });
    } catch (error) {
      console.error('Failed to update publish status:', error);
      alert('Failed to update publish status');
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      await deleteMutation.mutateAsync(pageId);
    } catch (error) {
      console.error('Failed to delete page:', error);
      alert('Failed to delete page');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Pages</h2>
          <p className="text-gray-600 mt-1">Manage website content and pages</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
          <Button onClick={handleOpenCreateModal} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Page</span>
          </Button>
        </div>
      </div>

      {/* Content Pages List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading pages...</p>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No content pages found</p>
            <Button className="mt-4" onClick={handleOpenCreateModal}>Create First Page</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {page.title}
                          </div>
                          {page.metaDescription && (
                            <div className="text-sm text-gray-500 truncate max-w-md">
                              {page.metaDescription}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        /{page.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          handleTogglePublish(page.id, page.isPublished)
                        }
                        disabled={togglePublishMutation.isPending}
                        className={`flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full ${
                          page.isPublished
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {togglePublishMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : page.isPublished ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(page.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <a
                          href={`/content/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium px-2 py-1"
                        >
                          View
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(page);
                          }}
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(page.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
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
          <strong>Tip:</strong> Content pages are accessible at{' '}
          <code className="bg-blue-100 px-2 py-1 rounded">/content/[slug]</code>.
          Toggle the status to publish or unpublish pages. For static pages (About, Terms, Privacy),
          use the <a href="/admin/static-pages" className="underline font-medium">Static Pages</a> editor.
        </p>
      </div>

      {/* Edit/Create Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseModal();
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPage ? 'Edit Page' : 'Create New Page'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    title,
                    slug: !editingPage && !prev.slug ? generateSlug(title) : prev.slug,
                  }));
                }}
                placeholder="Page Title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">/content/</span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="page-slug"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Page content (HTML supported)"
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input
                id="metaTitle"
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                placeholder="SEO Title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                placeholder="SEO Description"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPublished">Publish immediately</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePage}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingPage ? (
                'Update Page'
              ) : (
                'Create Page'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
