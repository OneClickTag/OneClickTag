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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Save,
  Loader2,
  RefreshCw,
  Palette,
  Globe,
  Code,
  Search,
  BarChart3,
  Share2,
  Shield,
  FileCode,
  Eye,
  AlertCircle,
  CheckCircle2,
  Info,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';

interface SeoSettings {
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  robotsNoIndex?: boolean;
  robotsNoFollow?: boolean;
  canonicalUrl?: string;
  twitterCardType?: string;
  ogType?: string;
  structuredData?: string;
}

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
  seoSettings?: SeoSettings;
}

export default function AdminSiteSettingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('branding');
  const [formData, setFormData] = useState<SiteSettings>({
    brandName: '',
    logoUrl: '',
    faviconUrl: '',
    metaTitle: '',
    metaDescription: '',
    socialImageUrl: '',
    customCSS: '',
    customJS: '',
    seoSettings: {
      googleAnalyticsId: '',
      googleTagManagerId: '',
      robotsNoIndex: false,
      robotsNoFollow: false,
      canonicalUrl: '',
      twitterCardType: 'summary_large_image',
      ogType: 'website',
      structuredData: '',
    },
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

  const validateStructuredData = (jsonString: string): { valid: boolean; error?: string } => {
    if (!jsonString || jsonString.trim() === '') return { valid: true };
    try {
      JSON.parse(jsonString);
      return { valid: true };
    } catch (e) {
      return { valid: false, error: (e as Error).message };
    }
  };

  const structuredDataValidation = validateStructuredData(formData.seoSettings?.structuredData || '');

  const getRobotsMetaContent = () => {
    const parts: string[] = [];
    if (formData.seoSettings?.robotsNoIndex) parts.push('noindex');
    else parts.push('index');
    if (formData.seoSettings?.robotsNoFollow) parts.push('nofollow');
    else parts.push('follow');
    return parts.join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Site Settings</h2>
          <p className="text-gray-600 mt-1">Configure global site settings, branding, and SEO</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save All
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="seo" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Custom Code
              </TabsTrigger>
            </TabsList>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Brand Identity
                  </CardTitle>
                  <CardDescription>
                    Configure your brand name, logo, and visual assets
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
                      <p className="text-xs text-gray-500 mt-1">Your company or product name</p>
                    </div>
                    <div>
                      <Label htmlFor="logoUrl">Logo URL</Label>
                      <Input
                        id="logoUrl"
                        value={formData.logoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        placeholder="https://example.com/logo.png"
                      />
                      <p className="text-xs text-gray-500 mt-1">Recommended: SVG or PNG with transparent background</p>
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
                      <p className="text-xs text-gray-500 mt-1">Recommended: 32x32px ICO or PNG</p>
                    </div>
                    <div>
                      <Label htmlFor="heroBackgroundUrl">Hero Background URL</Label>
                      <Input
                        id="heroBackgroundUrl"
                        value={formData.heroBackgroundUrl || ''}
                        onChange={(e) => setFormData({ ...formData, heroBackgroundUrl: e.target.value })}
                        placeholder="https://example.com/hero.jpg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Landing page background image</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-6">
              {/* Link to Page-Level SEO */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Page-Level SEO & Sitemap</p>
                        <p className="text-sm text-blue-700">
                          Manage SEO settings for individual pages and configure your sitemap
                        </p>
                      </div>
                    </div>
                    <Link href="/admin/seo">
                      <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Go to SEO Manager
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Basic Meta Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Basic Meta Tags
                  </CardTitle>
                  <CardDescription>
                    Essential meta information for search engines
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="metaTitle">Meta Title</Label>
                      <span className="text-xs text-gray-500">
                        {(formData.metaTitle || '').length}/60 characters
                      </span>
                    </div>
                    <Input
                      id="metaTitle"
                      value={formData.metaTitle || ''}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                      placeholder="OneClickTag - Simplify Your Tracking Setup"
                      maxLength={60}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The title that appears in search results. Keep it under 60 characters.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="metaDescription">Meta Description</Label>
                      <span className="text-xs text-gray-500">
                        {(formData.metaDescription || '').length}/160 characters
                      </span>
                    </div>
                    <Textarea
                      id="metaDescription"
                      value={formData.metaDescription || ''}
                      onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                      placeholder="OneClickTag makes it easy to set up Google tracking for your marketing campaigns. No technical knowledge required."
                      rows={3}
                      maxLength={160}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The description shown in search results. Keep it under 160 characters.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="canonicalUrl">Canonical URL</Label>
                    <Input
                      id="canonicalUrl"
                      value={formData.seoSettings?.canonicalUrl || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        seoSettings: { ...formData.seoSettings, canonicalUrl: e.target.value }
                      })}
                      placeholder="https://oneclicktag.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The primary URL for your site. Used to prevent duplicate content issues.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Social Media / Open Graph */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Social Media & Open Graph
                  </CardTitle>
                  <CardDescription>
                    Control how your site appears when shared on social media
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="socialImageUrl">Social Share Image (OG Image)</Label>
                    <Input
                      id="socialImageUrl"
                      value={formData.socialImageUrl || ''}
                      onChange={(e) => setFormData({ ...formData, socialImageUrl: e.target.value })}
                      placeholder="https://example.com/og-image.jpg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended size: 1200x630px. Used when sharing on Facebook, LinkedIn, etc.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="ogType">Open Graph Type</Label>
                      <Select
                        value={formData.seoSettings?.ogType || 'website'}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          seoSettings: { ...formData.seoSettings, ogType: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select OG type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="profile">Profile</SelectItem>
                          <SelectItem value="business.business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Defines the type of content being shared
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="twitterCardType">Twitter Card Type</Label>
                      <Select
                        value={formData.seoSettings?.twitterCardType || 'summary_large_image'}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          seoSettings: { ...formData.seoSettings, twitterCardType: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select card type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">Summary</SelectItem>
                          <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                          <SelectItem value="app">App</SelectItem>
                          <SelectItem value="player">Player</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        How your content appears on Twitter/X
                      </p>
                    </div>
                  </div>

                  {/* Social Preview */}
                  <div className="mt-6">
                    <Label className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4" />
                      Social Share Preview
                    </Label>
                    <div className="border rounded-lg overflow-hidden max-w-md bg-white">
                      {formData.socialImageUrl ? (
                        <div className="aspect-[1200/630] bg-gray-100 flex items-center justify-center">
                          <img
                            src={formData.socialImageUrl}
                            alt="Social preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="aspect-[1200/630] bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No image set</span>
                        </div>
                      )}
                      <div className="p-3 border-t">
                        <p className="text-xs text-gray-500 uppercase">
                          {formData.seoSettings?.canonicalUrl || 'oneclicktag.com'}
                        </p>
                        <p className="font-semibold text-sm mt-1 line-clamp-1">
                          {formData.metaTitle || 'Your Site Title'}
                        </p>
                        <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                          {formData.metaDescription || 'Your site description will appear here...'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Robots & Indexing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Search Engine Indexing
                  </CardTitle>
                  <CardDescription>
                    Control how search engines crawl and index your site
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Info className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      Current robots meta: <code className="bg-gray-200 px-1 rounded">{getRobotsMetaContent()}</code>
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label htmlFor="robotsNoIndex" className="font-medium">Noindex</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Prevent search engines from indexing your site
                        </p>
                      </div>
                      <Switch
                        id="robotsNoIndex"
                        checked={formData.seoSettings?.robotsNoIndex || false}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          seoSettings: { ...formData.seoSettings, robotsNoIndex: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label htmlFor="robotsNoFollow" className="font-medium">Nofollow</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Prevent search engines from following links
                        </p>
                      </div>
                      <Switch
                        id="robotsNoFollow"
                        checked={formData.seoSettings?.robotsNoFollow || false}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          seoSettings: { ...formData.seoSettings, robotsNoFollow: checked }
                        })}
                      />
                    </div>
                  </div>
                  {(formData.seoSettings?.robotsNoIndex || formData.seoSettings?.robotsNoFollow) && (
                    <div className="flex items-start p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800">
                        Warning: These settings will affect your sites visibility in search engines.
                        Only enable if you understand the implications.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Structured Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="w-5 h-5" />
                    Structured Data (JSON-LD)
                  </CardTitle>
                  <CardDescription>
                    Add schema markup for rich snippets in search results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="structuredData">JSON-LD Schema</Label>
                      {formData.seoSettings?.structuredData && (
                        <Badge variant={structuredDataValidation.valid ? 'default' : 'destructive'}>
                          {structuredDataValidation.valid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Valid JSON
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Invalid JSON
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                    <Textarea
                      id="structuredData"
                      value={formData.seoSettings?.structuredData || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        seoSettings: { ...formData.seoSettings, structuredData: e.target.value }
                      })}
                      placeholder={`{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "OneClickTag",
  "url": "https://oneclicktag.com",
  "logo": "https://oneclicktag.com/logo.png"
}`}
                      rows={10}
                      className="font-mono text-sm"
                    />
                    {!structuredDataValidation.valid && structuredDataValidation.error && (
                      <p className="text-xs text-red-500 mt-1">
                        JSON Error: {structuredDataValidation.error}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Add structured data to help search engines understand your content better.
                      <a
                        href="https://schema.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline ml-1"
                      >
                        Learn more at Schema.org
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Google Analytics & Tag Manager
                  </CardTitle>
                  <CardDescription>
                    Connect your Google analytics and tracking tools
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="googleAnalyticsId">Google Analytics 4 Measurement ID</Label>
                      <Input
                        id="googleAnalyticsId"
                        value={formData.seoSettings?.googleAnalyticsId || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seoSettings: { ...formData.seoSettings, googleAnalyticsId: e.target.value }
                        })}
                        placeholder="G-XXXXXXXXXX"
                      />
                      <p className="text-xs text-gray-500">
                        Found in GA4 Admin &gt; Data Streams &gt; Web Stream Details
                      </p>
                      {formData.seoSettings?.googleAnalyticsId && (
                        <Badge variant="outline" className="mt-2">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                          GA4 Configured
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="googleTagManagerId">Google Tag Manager Container ID</Label>
                      <Input
                        id="googleTagManagerId"
                        value={formData.seoSettings?.googleTagManagerId || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seoSettings: { ...formData.seoSettings, googleTagManagerId: e.target.value }
                        })}
                        placeholder="GTM-XXXXXXX"
                      />
                      <p className="text-xs text-gray-500">
                        Found in GTM Admin &gt; Container Settings
                      </p>
                      {formData.seoSettings?.googleTagManagerId && (
                        <Badge variant="outline" className="mt-2">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                          GTM Configured
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Integration Tips</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>- Use GTM to manage all your tracking tags in one place</li>
                      <li>- GA4 can be loaded via GTM for better control</li>
                      <li>- Test tracking in debug mode before publishing</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Custom Code Tab */}
            <TabsContent value="code" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Custom CSS
                  </CardTitle>
                  <CardDescription>
                    Add custom styles to override default styling
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    id="customCSS"
                    value={formData.customCSS || ''}
                    onChange={(e) => setFormData({ ...formData, customCSS: e.target.value })}
                    placeholder={`/* Custom CSS */
.hero-section {
  background-color: #f0f0f0;
}

.cta-button {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}`}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    CSS will be injected into the page head. Use with caution.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="w-5 h-5" />
                    Custom JavaScript
                  </CardTitle>
                  <CardDescription>
                    Add custom scripts for additional functionality
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    id="customJS"
                    value={formData.customJS || ''}
                    onChange={(e) => setFormData({ ...formData, customJS: e.target.value })}
                    placeholder={`// Custom JavaScript
document.addEventListener('DOMContentLoaded', function() {
  console.log('Custom script loaded');
});`}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-start p-3 bg-amber-50 border border-amber-200 rounded-lg mt-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      Warning: Custom JavaScript runs on every page load. Incorrect code can break your site.
                      Test thoroughly before deploying.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Floating Save Button */}
          <div className="fixed bottom-6 right-6 md:hidden">
            <Button
              type="submit"
              size="lg"
              disabled={saveMutation.isPending}
              className="shadow-lg"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
