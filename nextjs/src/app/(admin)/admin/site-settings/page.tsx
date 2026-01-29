'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, Loader2, RefreshCw, Palette, Globe, Code } from 'lucide-react';

interface SiteSettings {
  id?: string;
  key?: string;
  brandName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  brandColors?: Record<string, string>;
  heroBackgroundUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  socialImageUrl?: string;
  customCSS?: string;
  customJS?: string;
}

export default function AdminSiteSettingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<SiteSettings>({
    brandName: '',
    logoUrl: '',
    faviconUrl: '',
    metaTitle: '',
    metaDescription: '',
    socialImageUrl: '',
    customCSS: '',
    customJS: '',
  });

  const { isLoading, refetch } = useQuery({
    queryKey: ['admin', 'site-settings', 'global'],
    queryFn: async () => {
      const response = await api.get<SiteSettings>('/api/admin/site-settings/global');
      if (response) {
        setFormData(response);
      }
      return response;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: SiteSettings) => api.put('/api/admin/site-settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
      alert('Site settings saved successfully!');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Site Settings</h2>
          <p className="text-gray-600 mt-1">Configure global site settings and branding</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding
              </CardTitle>
              <CardDescription>
                Configure your brand identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="brandName">Brand Name</Label>
                  <Input
                    id="brandName"
                    value={formData.brandName || ''}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="OneClickTag"
                  />
                </div>
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={formData.logoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="faviconUrl">Favicon URL</Label>
                  <Input
                    id="faviconUrl"
                    value={formData.faviconUrl || ''}
                    onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
                <div>
                  <Label htmlFor="heroBackgroundUrl">Hero Background URL</Label>
                  <Input
                    id="heroBackgroundUrl"
                    value={formData.heroBackgroundUrl || ''}
                    onChange={(e) => setFormData({ ...formData, heroBackgroundUrl: e.target.value })}
                    placeholder="https://example.com/hero.jpg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                SEO & Meta
              </CardTitle>
              <CardDescription>
                Configure search engine optimization settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle || ''}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder="OneClickTag - Simplify Your Tracking Setup"
                />
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription || ''}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  placeholder="OneClickTag makes it easy to set up Google tracking..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="socialImageUrl">Social Share Image URL</Label>
                <Input
                  id="socialImageUrl"
                  value={formData.socialImageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, socialImageUrl: e.target.value })}
                  placeholder="https://example.com/og-image.jpg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Custom Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Custom Code
              </CardTitle>
              <CardDescription>
                Add custom CSS and JavaScript (use with caution)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customCSS">Custom CSS</Label>
                <Textarea
                  id="customCSS"
                  value={formData.customCSS || ''}
                  onChange={(e) => setFormData({ ...formData, customCSS: e.target.value })}
                  placeholder="/* Add your custom CSS here */"
                  rows={5}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="customJS">Custom JavaScript</Label>
                <Textarea
                  id="customJS"
                  value={formData.customJS || ''}
                  onChange={(e) => setFormData({ ...formData, customJS: e.target.value })}
                  placeholder="// Add your custom JavaScript here"
                  rows={5}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save All Settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
