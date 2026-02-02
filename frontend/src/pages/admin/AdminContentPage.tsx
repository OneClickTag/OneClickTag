import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { FileText, Plus, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { EditContentModal } from '@/components/admin/EditContentModal';
import { adminContentService, ContentPage } from '@/lib/api/services/admin';

export function AdminContentPage() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<ContentPage | null>(null);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const data = await adminContentService.getAll();
      console.log('📄 Content pages received:', data);
      console.log('📄 Is array?', Array.isArray(data));
      console.log('📄 Data type:', typeof data);

      // Handle different response formats
      if (Array.isArray(data)) {
        setPages(data);
      } else if (data && typeof data === 'object' && 'data' in data) {
        // Handle wrapped response
        const wrapped = data as any;
        setPages(Array.isArray(wrapped.data) ? wrapped.data : []);
      } else {
        console.warn('Unexpected data format:', data);
        setPages([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch content pages:', error);
      console.error('Error details:', error?.response?.data);
      setPages([]); // Set to empty array on error
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        alert('Access denied. Please logout and login again to refresh your permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleTogglePublish = async (pageId: string, currentStatus: boolean) => {
    try {
      await adminContentService.togglePublish(pageId, { isPublished: !currentStatus });
      fetchPages();
    } catch (error) {
      console.error('Failed to update publish status:', error);
      alert('Failed to update publish status');
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      await adminContentService.delete(pageId);
      alert('Page deleted successfully');
      fetchPages();
    } catch (error) {
      console.error('Failed to delete page:', error);
      alert('Failed to delete page');
    }
  };

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
  };

  const handleSavePage = async (pageData: Partial<ContentPage>) => {
    try {
      if (editingPage) {
        // Update existing page
        await adminContentService.update(editingPage.id, pageData);
      } else {
        // Create new page
        await adminContentService.create(pageData as any);
      }
      fetchPages();
    } catch (error) {
      console.error('Failed to save page:', error);
      throw error;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Content Pages</h2>
            <p className="text-gray-600 mt-1">Manage website content and pages</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchPages} className="flex items-center space-x-2">
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
          {loading ? (
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
                            <div className="font-medium text-gray-900">{page.title}</div>
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
                          onClick={() => handleTogglePublish(page.id, page.isPublished)}
                          className={`flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full ${
                            page.isPublished
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {page.isPublished ? (
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
                        <a
                          href={`/content/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium mr-4"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleOpenEditModal(page)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
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
            <strong>Tip:</strong> Content pages are accessible at <code className="bg-blue-100 px-2 py-1 rounded">/content/[slug]</code>.
            For main pages (about, contact, terms, privacy), use direct routes instead.
            Toggle the status to publish or unpublish pages.
          </p>
        </div>

        {/* Edit Content Modal */}
        <EditContentModal
          page={editingPage}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSavePage}
        />
      </div>
    </AdminLayout>
  );
}
