import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw, Settings } from 'lucide-react';
import { adminSiteSettingsService, SiteSettings, UpdateSiteSettingsData } from '@/lib/api/services/admin';

export function AdminSiteSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

        {/* SEO & Meta Tags */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO & Meta Tags</h3>
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
              <p className="text-xs text-gray-500 mt-1">Recommended: 50-60 characters</p>
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
              <p className="text-xs text-gray-500 mt-1">Recommended: 150-160 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Social Share Image URL</label>
              <input
                type="text"
                value={formData.socialImageUrl}
                onChange={(e) => updateFormData('socialImageUrl', e.target.value)}
                placeholder="https://example.com/social-share.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Used for social media sharing (1200x630px recommended)</p>
            </div>
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
