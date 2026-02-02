import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw, Settings, Search, Share2, Twitter, Bot, Link, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { adminSiteSettingsService, SiteSettings, UpdateSiteSettingsData } from '@/lib/api/services/admin';

export function AdminSiteSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    openGraph: true,
    twitter: true,
    robots: true,
    canonical: true,
    schema: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const [formData, setFormData] = useState<UpdateSiteSettingsData>({
    brandName: '',
    logoUrl: '',
    faviconUrl: '',
    heroBackgroundUrl: '',
    brandColors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      accent: '#10B981',
    },
    metaTitle: '',
    metaDescription: '',
    metaTitleTemplate: '',
    // Open Graph
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    ogType: 'website',
    ogSiteName: '',
    ogLocale: 'en_US',
    // Twitter
    twitterCard: 'summary_large_image',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    twitterSite: '',
    twitterCreator: '',
    // Robots
    robotsIndex: true,
    robotsFollow: true,
    robotsNoArchive: false,
    robotsNoSnippet: false,
    robotsNoImageIndex: false,
    googleVerification: '',
    bingVerification: '',
    // Canonical
    canonicalUrl: '',
    forceTrailingSlash: false,
    // Schema
    schemaType: 'Organization',
    schemaData: {},
    // Legacy
    socialImageUrl: '',
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await adminSiteSettingsService.getGlobal();
      console.log('Site settings received:', data);
      setSettings(data);

      // Populate form with existing data
      setFormData({
        brandName: data.brandName || '',
        logoUrl: data.logoUrl || '',
        faviconUrl: data.faviconUrl || '',
        heroBackgroundUrl: data.heroBackgroundUrl || '',
        brandColors: data.brandColors || {
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          accent: '#10B981',
        },
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        metaTitleTemplate: data.metaTitleTemplate || '',
        // Open Graph
        ogTitle: data.ogTitle || '',
        ogDescription: data.ogDescription || '',
        ogImage: data.ogImage || '',
        ogType: data.ogType || 'website',
        ogSiteName: data.ogSiteName || '',
        ogLocale: data.ogLocale || 'en_US',
        // Twitter
        twitterCard: data.twitterCard || 'summary_large_image',
        twitterTitle: data.twitterTitle || '',
        twitterDescription: data.twitterDescription || '',
        twitterImage: data.twitterImage || '',
        twitterSite: data.twitterSite || '',
        twitterCreator: data.twitterCreator || '',
        // Robots
        robotsIndex: data.robotsIndex ?? true,
        robotsFollow: data.robotsFollow ?? true,
        robotsNoArchive: data.robotsNoArchive ?? false,
        robotsNoSnippet: data.robotsNoSnippet ?? false,
        robotsNoImageIndex: data.robotsNoImageIndex ?? false,
        googleVerification: data.googleVerification || '',
        bingVerification: data.bingVerification || '',
        // Canonical
        canonicalUrl: data.canonicalUrl || '',
        forceTrailingSlash: data.forceTrailingSlash ?? false,
        // Schema
        schemaType: data.schemaType || 'Organization',
        schemaData: data.schemaData || {},
        // Legacy
        socialImageUrl: data.socialImageUrl || '',
      });
    } catch (error: any) {
      console.error('Failed to fetch site settings:', error);
      console.error('Error details:', error?.response?.data);
      setMessage({ type: 'error', text: 'Failed to load site settings' });
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        alert('Access denied. Please logout and login again to refresh your permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await adminSiteSettingsService.updateGlobal(formData);
      setMessage({ type: 'success', text: 'Site settings saved successfully!' });
      fetchSettings();
    } catch (error: any) {
      console.error('Failed to save site settings:', error);
      console.error('Error details:', error?.response?.data);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to save site settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof UpdateSiteSettingsData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateBrandColor = (colorKey: 'primary' | 'secondary' | 'accent', value: string) => {
    setFormData(prev => ({
      ...prev,
      brandColors: {
        ...prev.brandColors,
        [colorKey]: value,
      },
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading site settings...</p>
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
            <h2 className="text-2xl font-bold text-gray-900">Site Settings</h2>
            <p className="text-gray-600 mt-1">Manage global site settings, branding, and metadata</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchSettings} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex items-center space-x-2">
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
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

        {/* Brand Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Brand Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name</label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => updateFormData('brandName', e.target.value)}
                placeholder="OneClickTag"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
              <input
                type="text"
                value={formData.logoUrl}
                onChange={(e) => updateFormData('logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Favicon URL</label>
              <input
                type="text"
                value={formData.faviconUrl}
                onChange={(e) => updateFormData('faviconUrl', e.target.value)}
                placeholder="https://example.com/favicon.ico"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hero Background URL</label>
              <input
                type="text"
                value={formData.heroBackgroundUrl}
                onChange={(e) => updateFormData('heroBackgroundUrl', e.target.value)}
                placeholder="https://example.com/hero-bg.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Colors</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.brandColors?.primary || '#3B82F6'}
                  onChange={(e) => updateBrandColor('primary', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.brandColors?.primary || '#3B82F6'}
                  onChange={(e) => updateBrandColor('primary', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.brandColors?.secondary || '#8B5CF6'}
                  onChange={(e) => updateBrandColor('secondary', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.brandColors?.secondary || '#8B5CF6'}
                  onChange={(e) => updateBrandColor('secondary', e.target.value)}
                  placeholder="#8B5CF6"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.brandColors?.accent || '#10B981'}
                  onChange={(e) => updateBrandColor('accent', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.brandColors?.accent || '#10B981'}
                  onChange={(e) => updateBrandColor('accent', e.target.value)}
                  placeholder="#10B981"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Basic SEO & Meta Tags */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Search className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Basic SEO</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
              <input
                type="text"
                value={formData.metaTitle}
                onChange={(e) => updateFormData('metaTitle', e.target.value)}
                placeholder="OneClickTag - Simplify Your Conversion Tracking"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 50-60 characters ({(formData.metaTitle || '').length}/60)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title Template</label>
              <input
                type="text"
                value={formData.metaTitleTemplate}
                onChange={(e) => updateFormData('metaTitleTemplate', e.target.value)}
                placeholder="%s | OneClickTag"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Use %s as placeholder for page-specific title. Example: &quot;%s | OneClickTag&quot;</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
              <textarea
                value={formData.metaDescription}
                onChange={(e) => updateFormData('metaDescription', e.target.value)}
                rows={3}
                placeholder="Automate your Google Tag Manager and Google Ads tracking setup with OneClickTag..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 150-160 characters ({(formData.metaDescription || '').length}/160)</p>
            </div>
          </div>
        </div>

        {/* Advanced SEO Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Advanced SEO Settings</h3>
          </div>

          {/* Open Graph Settings */}
          <div className="mb-6 border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('openGraph')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Open Graph (Facebook, LinkedIn)</span>
              </div>
              {expandedSections.openGraph ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            {expandedSections.openGraph && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Title</label>
                    <input
                      type="text"
                      value={formData.ogTitle}
                      onChange={(e) => updateFormData('ogTitle', e.target.value)}
                      placeholder="Leave empty to use meta title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Site Name</label>
                    <input
                      type="text"
                      value={formData.ogSiteName}
                      onChange={(e) => updateFormData('ogSiteName', e.target.value)}
                      placeholder="OneClickTag"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">OG Description</label>
                  <textarea
                    value={formData.ogDescription}
                    onChange={(e) => updateFormData('ogDescription', e.target.value)}
                    rows={2}
                    placeholder="Leave empty to use meta description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">OG Image URL</label>
                  <input
                    type="text"
                    value={formData.ogImage}
                    onChange={(e) => updateFormData('ogImage', e.target.value)}
                    placeholder="https://example.com/og-image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 1200x630px for Facebook/LinkedIn</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Type</label>
                    <select
                      value={formData.ogType}
                      onChange={(e) => updateFormData('ogType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="website">Website</option>
                      <option value="article">Article</option>
                      <option value="product">Product</option>
                      <option value="profile">Profile</option>
                      <option value="book">Book</option>
                      <option value="music.song">Music</option>
                      <option value="video.movie">Video</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Locale</label>
                    <select
                      value={formData.ogLocale}
                      onChange={(e) => updateFormData('ogLocale', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="en_US">English (US)</option>
                      <option value="en_GB">English (UK)</option>
                      <option value="es_ES">Spanish</option>
                      <option value="fr_FR">French</option>
                      <option value="de_DE">German</option>
                      <option value="it_IT">Italian</option>
                      <option value="pt_BR">Portuguese (Brazil)</option>
                      <option value="ja_JP">Japanese</option>
                      <option value="zh_CN">Chinese (Simplified)</option>
                      <option value="ko_KR">Korean</option>
                      <option value="he_IL">Hebrew</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Twitter Card Settings */}
          <div className="mb-6 border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('twitter')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Twitter className="w-5 h-5 text-sky-500" />
                <span className="font-medium text-gray-900">Twitter Card</span>
              </div>
              {expandedSections.twitter ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            {expandedSections.twitter && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                    <select
                      value={formData.twitterCard}
                      onChange={(e) => updateFormData('twitterCard', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="summary">Summary</option>
                      <option value="summary_large_image">Summary with Large Image</option>
                      <option value="app">App</option>
                      <option value="player">Player</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Title</label>
                    <input
                      type="text"
                      value={formData.twitterTitle}
                      onChange={(e) => updateFormData('twitterTitle', e.target.value)}
                      placeholder="Leave empty to use OG/meta title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Description</label>
                  <textarea
                    value={formData.twitterDescription}
                    onChange={(e) => updateFormData('twitterDescription', e.target.value)}
                    rows={2}
                    placeholder="Leave empty to use OG/meta description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Image URL</label>
                  <input
                    type="text"
                    value={formData.twitterImage}
                    onChange={(e) => updateFormData('twitterImage', e.target.value)}
                    placeholder="Leave empty to use OG image"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 1200x600px (2:1 ratio)</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter @Site</label>
                    <input
                      type="text"
                      value={formData.twitterSite}
                      onChange={(e) => updateFormData('twitterSite', e.target.value)}
                      placeholder="@oneclicktag"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Your brand Twitter handle</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter @Creator</label>
                    <input
                      type="text"
                      value={formData.twitterCreator}
                      onChange={(e) => updateFormData('twitterCreator', e.target.value)}
                      placeholder="@username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Content creator handle (optional)</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Robots & Indexing */}
          <div className="mb-6 border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('robots')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900">Robots & Indexing</span>
              </div>
              {expandedSections.robots ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            {expandedSections.robots && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.robotsIndex ?? true}
                      onChange={(e) => updateFormData('robotsIndex', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Allow Indexing</span>
                      <p className="text-xs text-gray-500">Let search engines index pages</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.robotsFollow ?? true}
                      onChange={(e) => updateFormData('robotsFollow', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Allow Follow</span>
                      <p className="text-xs text-gray-500">Let search engines follow links</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.robotsNoArchive ?? false}
                      onChange={(e) => updateFormData('robotsNoArchive', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">No Archive</span>
                      <p className="text-xs text-gray-500">Prevent cached copies</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.robotsNoSnippet ?? false}
                      onChange={(e) => updateFormData('robotsNoSnippet', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">No Snippet</span>
                      <p className="text-xs text-gray-500">Prevent text snippets</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.robotsNoImageIndex ?? false}
                      onChange={(e) => updateFormData('robotsNoImageIndex', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">No Image Index</span>
                      <p className="text-xs text-gray-500">Prevent image indexing</p>
                    </div>
                  </label>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Search Engine Verification</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Google Search Console</label>
                      <input
                        type="text"
                        value={formData.googleVerification}
                        onChange={(e) => updateFormData('googleVerification', e.target.value)}
                        placeholder="Google verification code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Bing Webmaster Tools</label>
                      <input
                        type="text"
                        value={formData.bingVerification}
                        onChange={(e) => updateFormData('bingVerification', e.target.value)}
                        placeholder="Bing verification code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Canonical URL Settings */}
          <div className="mb-6 border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('canonical')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Link className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-900">Canonical URL Settings</span>
              </div>
              {expandedSections.canonical ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            {expandedSections.canonical && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Canonical URL</label>
                  <input
                    type="text"
                    value={formData.canonicalUrl}
                    onChange={(e) => updateFormData('canonicalUrl', e.target.value)}
                    placeholder="https://oneclicktag.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">The preferred version of your domain (without trailing slash)</p>
                </div>
                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.forceTrailingSlash ?? false}
                    onChange={(e) => updateFormData('forceTrailingSlash', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Force Trailing Slash</span>
                    <p className="text-xs text-gray-500">Add trailing slash to all canonical URLs (e.g., /about/)</p>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Schema.org / JSON-LD Settings */}
          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('schema')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-gray-900">Schema.org / JSON-LD</span>
              </div>
              {expandedSections.schema ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            {expandedSections.schema && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schema Type</label>
                  <select
                    value={formData.schemaType}
                    onChange={(e) => updateFormData('schemaType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Organization">Organization</option>
                    <option value="LocalBusiness">Local Business</option>
                    <option value="WebSite">Website</option>
                    <option value="Person">Person</option>
                    <option value="Product">Product</option>
                    <option value="SoftwareApplication">Software Application</option>
                    <option value="Corporation">Corporation</option>
                    <option value="EducationalOrganization">Educational Organization</option>
                    <option value="GovernmentOrganization">Government Organization</option>
                    <option value="MedicalOrganization">Medical Organization</option>
                    <option value="NGO">NGO</option>
                    <option value="SportsOrganization">Sports Organization</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom JSON-LD Schema</label>
                  <textarea
                    value={formData.schemaData && Object.keys(formData.schemaData).length > 0 ? JSON.stringify(formData.schemaData, null, 2) : ''}
                    onChange={(e) => {
                      try {
                        const parsed = e.target.value ? JSON.parse(e.target.value) : {};
                        updateFormData('schemaData', parsed);
                      } catch {
                        // Allow invalid JSON while typing
                      }
                    }}
                    rows={8}
                    placeholder={`{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "OneClickTag",
  "url": "https://oneclicktag.com",
  "logo": "https://oneclicktag.com/logo.png",
  "description": "Simplify your conversion tracking",
  "sameAs": [
    "https://twitter.com/oneclicktag",
    "https://linkedin.com/company/oneclicktag"
  ]
}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter valid JSON-LD structured data. Leave empty to auto-generate based on schema type.</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Tip:</strong> Use Google&apos;s{' '}
                    <a
                      href="https://search.google.com/test/rich-results"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-amber-900"
                    >
                      Rich Results Test
                    </a>{' '}
                    to validate your JSON-LD schema.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> These settings control the global appearance and SEO metadata for your site.
            Changes will be reflected across all public-facing pages. Use hex color codes for brand colors (e.g., #3B82F6).
          </p>
        </div>

        {/* Last Updated Info */}
        {settings && (
          <div className="text-sm text-gray-500">
            Last updated: {new Date(settings.updatedAt).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {settings.updatedBy && ` by ${settings.updatedBy}`}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
