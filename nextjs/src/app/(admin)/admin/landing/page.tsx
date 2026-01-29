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
  Layout,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface LandingSection {
  id: string;
  key: string;
  content: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminLandingPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<LandingSection | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    content: '{}',
    isActive: true,
  });

  const { data: sections = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'landing-page'],
    queryFn: () => api.get<LandingSection[]>('/api/admin/landing-page'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { key: string; content: unknown; isActive: boolean }) =>
      api.post('/api/admin/landing-page', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-page'] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; content?: unknown; isActive?: boolean }) =>
      api.patch(`/api/admin/landing-page/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-page'] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/landing-page/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-page'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/admin/landing-page/${id}/toggle-active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-page'] });
    },
  });

  const resetForm = () => {
    setFormData({ key: '', content: '{}', isActive: true });
    setEditingSection(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const content = JSON.parse(formData.content);
      if (editingSection) {
        await updateMutation.mutateAsync({
          id: editingSection.id,
          content,
          isActive: formData.isActive,
        });
      } else {
        await createMutation.mutateAsync({
          key: formData.key,
          content,
          isActive: formData.isActive,
        });
      }
    } catch (error) {
      console.error('Invalid JSON:', error);
      alert('Invalid JSON content');
    }
  };

  const handleEdit = (section: LandingSection) => {
    setEditingSection(section);
    setFormData({
      key: section.key,
      content: JSON.stringify(section.content, null, 2),
      isActive: section.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Landing Page</h2>
          <p className="text-gray-600 mt-1">Manage landing page content sections</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingSection ? 'Edit Section' : 'Add New Section'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="key">Section Key</Label>
                  <Input
                    id="key"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    placeholder="hero, features, pricing..."
                    disabled={!!editingSection}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content (JSON)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={10}
                    className="font-mono text-sm"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingSection ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sections List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Loading sections...</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12">
            <Layout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No landing page sections found</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              Create First Section
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {sections.map((section) => (
              <div key={section.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded font-medium">
                        {section.key}
                      </code>
                      <button
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: section.id,
                            isActive: !section.isActive,
                          })
                        }
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          section.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {section.isActive ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Inactive
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Updated: {new Date(section.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(section)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(section.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
