'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Save,
  Loader2,
  RefreshCw,
  MapPin,
  FileText,
  Globe,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Send,
  Edit2,
  Trash2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface PageSeoSettings {
  id?: string;
  pageSlug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  noIndex: boolean;
  noFollow: boolean;
  structuredData?: string | null;
  sitemapPriority: number;
  sitemapFreq: string;
  excludeFromSitemap: boolean;
}

interface PageWithSeo {
  pageSlug: string;
  pageTitle: string;
  seoSettings: PageSeoSettings | null;
}

interface SitemapEntry {
  url: string;
  pageSlug: string;
  pageTitle: string;
  lastModified: string;
  changeFrequency: string;
  priority: number;
  excluded: boolean;
  noIndex: boolean;
}

interface SitemapData {
  baseUrl: string;
  sitemapUrl: string;
  entries: SitemapEntry[];
  stats: {
    total: number;
    included: number;
    excluded: number;
    noIndex: number;
  };
}

export default function AdminSeoPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pages');
  const [editingPage, setEditingPage] = useState<PageWithSeo | null>(null);
  const [formData, setFormData] = useState<Partial<PageSeoSettings>>({});

  // Fetch page SEO settings
  const { data: seoData, isLoading: isLoadingPages, refetch: refetchPages } = useQuery({
    queryKey: ['admin', 'seo', 'pages'],
    queryFn: () => api.get<{ pages: PageWithSeo[]; settings: PageSeoSettings[] }>('/api/admin/seo'),
  });

  // Fetch sitemap preview
  const { data: sitemapData, isLoading: isLoadingSitemap, refetch: refetchSitemap } = useQuery({
    queryKey: ['admin', 'seo', 'sitemap'],
    queryFn: () => api.get<SitemapData>('/api/admin/seo/sitemap'),
  });

  // Save page SEO settings
  const saveMutation = useMutation({
    mutationFn: (data: Partial<PageSeoSettings>) => api.post('/api/admin/seo', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seo'] });
      setEditingPage(null);
      toast.success('SEO settings saved');
    },
    onError: () => {
      toast.error('Failed to save SEO settings');
    },
  });

  // Delete page SEO settings
  const deleteMutation = useMutation({
    mutationFn: (pageSlug: string) =>
      api.request('/api/admin/seo', {
        method: 'DELETE',
        body: JSON.stringify({ pageSlug }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seo'] });
      toast.success('SEO settings reset to defaults');
    },
    onError: () => {
      toast.error('Failed to reset SEO settings');
    },
  });

  // Ping search engines
  const pingMutation = useMutation({
    mutationFn: () => api.post('/api/admin/seo/sitemap', { action: 'ping' }),
    onSuccess: () => {
      toast.success('Sitemap ping sent to search engines');
    },
    onError: () => {
      toast.error('Failed to ping search engines');
    },
  });

  const openEditDialog = (page: PageWithSeo) => {
    setEditingPage(page);
    setFormData(page.seoSettings || {
      pageSlug: page.pageSlug,
      noIndex: false,
      noFollow: false,
      sitemapPriority: 0.5,
      sitemapFreq: 'monthly',
      excludeFromSitemap: false,
    });
  };

  const handleSave = () => {
    if (!editingPage) return;
    saveMutation.mutate({
      ...formData,
      pageSlug: editingPage.pageSlug,
    });
  };

  const handleDelete = (pageSlug: string) => {
    if (confirm('Reset SEO settings for this page to defaults?')) {
      deleteMutation.mutate(pageSlug);
    }
  };

  const validateStructuredData = (jsonString: string): { valid: boolean; error?: string } => {
    if (!jsonString || jsonString.trim() === '') return { valid: true };
    try {
      JSON.parse(jsonString);
      return { valid: true };
    } catch (e) {
      return { valid: false, error: (e as Error).message };
    }
  };

  const structuredDataValidation = validateStructuredData(formData.structuredData || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SEO Management</h2>
          <p className="text-gray-600 mt-1">
            Manage page-level SEO settings and sitemap configuration
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { refetchPages(); refetchSitemap(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {sitemapData && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Pages</p>
                  <p className="text-2xl font-bold">{sitemapData.stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Sitemap</p>
                  <p className="text-2xl font-bold text-green-600">{sitemapData.stats.included}</p>
                </div>
                <MapPin className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Excluded</p>
                  <p className="text-2xl font-bold text-gray-600">{sitemapData.stats.excluded}</p>
                </div>
                <EyeOff className="w-8 h-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">NoIndex</p>
                  <p className="text-2xl font-bold text-amber-600">{sitemapData.stats.noIndex}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Page SEO
          </TabsTrigger>
          <TabsTrigger value="sitemap" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Sitemap
          </TabsTrigger>
        </TabsList>

        {/* Page SEO Tab */}
        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Page-Level SEO Settings
              </CardTitle>
              <CardDescription>
                Override global SEO settings for specific pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Meta Title</TableHead>
                      <TableHead>Index</TableHead>
                      <TableHead>Sitemap</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seoData?.pages?.map((page) => (
                      <TableRow key={page.pageSlug}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{page.pageTitle}</p>
                            <p className="text-xs text-gray-500">{page.pageSlug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {page.seoSettings?.metaTitle ? (
                            <span className="text-sm truncate max-w-[200px] block">
                              {page.seoSettings.metaTitle}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Default</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {page.seoSettings?.noIndex ? (
                            <Badge variant="destructive">
                              <EyeOff className="w-3 h-3 mr-1" />
                              NoIndex
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              Index
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {page.seoSettings?.excludeFromSitemap ? (
                            <Badge variant="secondary">Excluded</Badge>
                          ) : (
                            <Badge variant="outline">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Included
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {page.seoSettings?.sitemapPriority?.toFixed(1) || '0.5'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(page)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {page.seoSettings && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(page.pageSlug)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sitemap Tab */}
        <TabsContent value="sitemap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Sitemap Preview
              </CardTitle>
              <CardDescription>
                Preview your sitemap.xml and notify search engines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sitemap URL */}
              {sitemapData && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Sitemap URL</p>
                    <p className="font-mono text-sm">{sitemapData.sitemapUrl}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(sitemapData.sitemapUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => pingMutation.mutate()}
                      disabled={pingMutation.isPending}
                    >
                      {pingMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Ping Search Engines
                    </Button>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">About Sitemap Pinging</p>
                  <p className="mt-1">
                    Pinging search engines notifies them that your sitemap has been updated.
                    This can help speed up indexing but is not a guarantee. Google and Bing
                    will crawl your sitemap at their own discretion.
                  </p>
                </div>
              </div>

              {/* Sitemap Entries Table */}
              {isLoadingSitemap ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sitemapData?.entries?.map((entry) => (
                      <TableRow
                        key={entry.pageSlug}
                        className={entry.excluded ? 'opacity-50' : ''}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.pageTitle}</p>
                            <p className="text-xs text-gray-500 font-mono">{entry.url}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.changeFrequency}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{entry.priority.toFixed(1)}</span>
                        </TableCell>
                        <TableCell>
                          {entry.excluded ? (
                            <Badge variant="secondary">Excluded</Badge>
                          ) : entry.noIndex ? (
                            <Badge variant="destructive">NoIndex</Badge>
                          ) : (
                            <Badge variant="outline">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingPage} onOpenChange={() => setEditingPage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit SEO Settings</DialogTitle>
            <DialogDescription>
              {editingPage?.pageTitle} ({editingPage?.pageSlug})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Meta Tags */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Search className="w-4 h-4" />
                Meta Tags
              </h4>
              <div>
                <Label htmlFor="metaTitle">Meta Title Override</Label>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle || ''}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder="Leave empty to use default"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(formData.metaTitle || '').length}/60 characters
                </p>
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta Description Override</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription || ''}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  placeholder="Leave empty to use default"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(formData.metaDescription || '').length}/160 characters
                </p>
              </div>
              <div>
                <Label htmlFor="canonicalUrl">Canonical URL</Label>
                <Input
                  id="canonicalUrl"
                  value={formData.canonicalUrl || ''}
                  onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                  placeholder="https://example.com/page"
                />
              </div>
            </div>

            {/* Indexing */}
            <div className="space-y-4">
              <h4 className="font-medium">Indexing</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>NoIndex</Label>
                    <p className="text-xs text-gray-500">Prevent indexing</p>
                  </div>
                  <Switch
                    checked={formData.noIndex || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, noIndex: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>NoFollow</Label>
                    <p className="text-xs text-gray-500">Prevent link following</p>
                  </div>
                  <Switch
                    checked={formData.noFollow || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, noFollow: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Sitemap */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Sitemap
              </h4>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Exclude from Sitemap</Label>
                  <p className="text-xs text-gray-500">Remove this page from sitemap.xml</p>
                </div>
                <Switch
                  checked={formData.excludeFromSitemap || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, excludeFromSitemap: checked })}
                />
              </div>
              <div>
                <Label>Priority: {(formData.sitemapPriority || 0.5).toFixed(1)}</Label>
                <Slider
                  value={[formData.sitemapPriority || 0.5]}
                  onValueChange={([value]) => setFormData({ ...formData, sitemapPriority: value })}
                  min={0}
                  max={1}
                  step={0.1}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher priority pages are considered more important
                </p>
              </div>
              <div>
                <Label>Change Frequency</Label>
                <Select
                  value={formData.sitemapFreq || 'monthly'}
                  onValueChange={(value) => setFormData({ ...formData, sitemapFreq: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Structured Data */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Page-Specific Structured Data</h4>
                {formData.structuredData && (
                  <Badge variant={structuredDataValidation.valid ? 'default' : 'destructive'}>
                    {structuredDataValidation.valid ? 'Valid JSON' : 'Invalid JSON'}
                  </Badge>
                )}
              </div>
              <Textarea
                value={formData.structuredData || ''}
                onChange={(e) => setFormData({ ...formData, structuredData: e.target.value })}
                placeholder={`{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Page Title"
}`}
                rows={8}
                className="font-mono text-sm"
              />
              {!structuredDataValidation.valid && structuredDataValidation.error && (
                <p className="text-xs text-red-500">{structuredDataValidation.error}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPage(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
