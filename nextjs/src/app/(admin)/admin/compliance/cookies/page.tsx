'use client';

import { useState } from 'react';
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
import {
  Cookie,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';

interface CookieItem {
  id: string;
  name: string;
  description?: string;
  domain: string;
  duration: string;
  categoryId: string;
  category?: { name: string };
  createdAt: string;
}

interface CookieCategory {
  id: string;
  name: string;
}

export default function CookiesPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCookie, setEditingCookie] = useState<CookieItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    domain: '',
    duration: '',
    categoryId: '',
  });

  const { data: cookies = [], isLoading, refetch } = useQuery({
    queryKey: ['compliance', 'cookies'],
    queryFn: () => api.get<CookieItem[]>('/api/compliance/cookies'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['compliance', 'cookie-categories'],
    queryFn: () => api.get<CookieCategory[]>('/api/compliance/cookie-categories'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.post('/api/compliance/cookies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'cookies'] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof formData) =>
      api.patch(`/api/compliance/cookies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'cookies'] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/compliance/cookies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'cookies'] });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', domain: '', duration: '', categoryId: '' });
    setEditingCookie(null);
  };

  const handleEdit = (cookie: CookieItem) => {
    setEditingCookie(cookie);
    setFormData({
      name: cookie.name,
      description: cookie.description || '',
      domain: cookie.domain,
      duration: cookie.duration,
      categoryId: cookie.categoryId,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCookie) {
      updateMutation.mutate({ id: editingCookie.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cookie?')) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cookies</h2>
          <p className="text-gray-600 mt-1">Manage individual cookie declarations</p>
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
                Add Cookie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCookie ? 'Edit Cookie' : 'Add New Cookie'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Cookie Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="_ga, _fbp, etc."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What this cookie is used for..."
                    rows={2}
                  />
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <Label htmlFor="domain">Domain</Label>
                    <Input
                      id="domain"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      placeholder=".example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="2 years, 1 session, etc."
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
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
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingCookie ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cookies Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Loading cookies...</p>
          </div>
        ) : cookies.length === 0 ? (
          <div className="text-center py-12">
            <Cookie className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No cookies declared yet</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              Declare First Cookie
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cookies.map((cookie) => (
                <TableRow key={cookie.id}>
                  <TableCell>
                    <div>
                      <code className="font-medium">{cookie.name}</code>
                      {cookie.description && (
                        <p className="text-xs text-gray-500 mt-1">{cookie.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{cookie.domain}</TableCell>
                  <TableCell>{cookie.duration}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {cookie.category?.name || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(cookie)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(cookie.id)}
                        disabled={deleteMutation.isPending}
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
    </div>
  );
}
