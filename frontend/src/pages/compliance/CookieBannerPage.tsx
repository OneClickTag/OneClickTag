import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw, Eye } from 'lucide-react';
import { adminComplianceService, ConsentBanner, UpdateConsentBannerData } from '@/lib/api/services/admin';

export function CookieBannerPage() {
  const [banner, setBanner] = useState<ConsentBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<UpdateConsentBannerData>({
    headingText: '',
    bodyText: '',
    acceptAllButtonText: '',
    rejectAllButtonText: '',
    customizeButtonText: '',
    savePreferencesText: '',
    backgroundColor: '#ffffff',
    textColor: '#1F2937',
    acceptButtonColor: '#3B82F6',
    rejectButtonColor: '#6B7280',
    customizeButtonColor: '#6B7280',
    position: 'bottom',
    consentExpiryDays: 365,
    showOnEveryPage: true,
    blockCookiesUntilConsent: true,
    privacyPolicyUrl: '/privacy',
    cookiePolicyUrl: '/cookie-policy',
    isActive: true,
  });

  const fetchBanner = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await adminComplianceService.getConsentBanner();
      setBanner(data);
      setFormData({
        headingText: data.headingText || '',
        bodyText: data.bodyText || '',
        acceptAllButtonText: data.acceptAllButtonText || '',
        rejectAllButtonText: data.rejectAllButtonText || '',
        customizeButtonText: data.customizeButtonText || '',
        savePreferencesText: data.savePreferencesText || '',
        backgroundColor: data.backgroundColor || '#ffffff',
        textColor: data.textColor || '#1F2937',
        acceptButtonColor: data.acceptButtonColor || '#3B82F6',
        rejectButtonColor: data.rejectButtonColor || '#6B7280',
        customizeButtonColor: data.customizeButtonColor || '#6B7280',
        position: data.position || 'bottom',
        consentExpiryDays: data.consentExpiryDays || 365,
        showOnEveryPage: data.showOnEveryPage ?? true,
        blockCookiesUntilConsent: data.blockCookiesUntilConsent ?? true,
        privacyPolicyUrl: data.privacyPolicyUrl || '/privacy',
        cookiePolicyUrl: data.cookiePolicyUrl || '/cookie-policy',
        isActive: data.isActive ?? true,
      });
    } catch (error: any) {
      console.error('Failed to fetch cookie banner:', error);
      setMessage({ type: 'error', text: 'Failed to load cookie banner settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanner();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      await adminComplianceService.updateConsentBanner(formData);
      setMessage({ type: 'success', text: 'Cookie banner settings saved successfully!' });
      fetchBanner();
    } catch (error: any) {
      console.error('Failed to save cookie banner:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to save cookie banner settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof UpdateConsentBannerData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPositionStyles = () => {
    const position = formData.position || 'bottom';
    if (position === 'bottom') return 'bottom-0 left-0 right-0';
    if (position === 'top') return 'top-0 left-0 right-0';
    return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading cookie banner settings...</p>
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
            <h2 className="text-2xl font-bold text-gray-900">Cookie Consent Banner</h2>
            <p className="text-gray-600 mt-1">Configure the appearance and text of your cookie consent banner</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchBanner} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
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

        <form onSubmit={handleSave} className="space-y-6">
          {/* Banner Text */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Banner Text</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heading Text <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.headingText}
                  onChange={(e) => updateFormData('headingText', e.target.value)}
                  placeholder="We use cookies"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.bodyText}
                  onChange={(e) => updateFormData('bodyText', e.target.value)}
                  placeholder="We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic."
                  rows={3}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accept Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.acceptAllButtonText}
                    onChange={(e) => updateFormData('acceptAllButtonText', e.target.value)}
                    placeholder="Accept All"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decline Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.rejectAllButtonText}
                    onChange={(e) => updateFormData('rejectAllButtonText', e.target.value)}
                    placeholder="Decline"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manage Preferences Text
                  </label>
                  <input
                    type="text"
                    value={formData.customizeButtonText}
                    onChange={(e) => updateFormData('customizeButtonText', e.target.value)}
                    placeholder="Manage Preferences"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.backgroundColor}
                    onChange={(e) => updateFormData('backgroundColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.backgroundColor}
                    onChange={(e) => updateFormData('backgroundColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Banner background color</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.textColor}
                    onChange={(e) => updateFormData('textColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.textColor}
                    onChange={(e) => updateFormData('textColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Accept Button Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.acceptButtonColor}
                    onChange={(e) => updateFormData('acceptButtonColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.acceptButtonColor}
                    onChange={(e) => updateFormData('acceptButtonColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reject Button Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.rejectButtonColor}
                    onChange={(e) => updateFormData('rejectButtonColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.rejectButtonColor}
                    onChange={(e) => updateFormData('rejectButtonColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <select
                  value={formData.position}
                  onChange={(e) => updateFormData('position', e.target.value as 'bottom' | 'top' | 'center')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                  <option value="center">Center (Modal)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Consent Expiry (days)
              </label>
              <input
                type="number"
                value={formData.consentExpiryDays}
                onChange={(e) => updateFormData('consentExpiryDays', parseInt(e.target.value))}
                min={1}
                max={730}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long to remember user consent (recommended: 365 days)
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="flex items-center space-x-2">
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Live Preview */}
        {showPreview && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
            <div className="relative border-2 border-gray-300 rounded-lg bg-gray-50 min-h-[400px] overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                Preview Background
              </div>
              <div className={`absolute ${getPositionStyles()} z-10 ${formData.position === 'center' ? 'max-w-lg' : ''}`}>
                <div
                  className="p-6 shadow-lg"
                  style={{
                    backgroundColor: formData.backgroundColor || '#ffffff',
                    borderTop: formData.position === 'bottom' ? `4px solid ${formData.acceptButtonColor}` : 'none',
                    borderBottom: formData.position === 'top' ? `4px solid ${formData.acceptButtonColor}` : 'none',
                    border: formData.position === 'center' ? `2px solid ${formData.acceptButtonColor}` : undefined,
                    borderRadius: formData.position === 'center' ? '8px' : '0',
                  }}
                >
                  <h4
                    className="text-lg font-bold mb-2"
                    style={{ color: formData.textColor }}
                  >
                    {formData.headingText || 'We use cookies'}
                  </h4>
                  <p
                    className="text-sm mb-4"
                    style={{ color: formData.textColor }}
                  >
                    {formData.bodyText || 'We use cookies to enhance your browsing experience.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="px-4 py-2 rounded-md text-white text-sm font-medium"
                      style={{ backgroundColor: formData.acceptButtonColor }}
                    >
                      {formData.acceptAllButtonText || 'Accept All'}
                    </button>
                    <button
                      className="px-4 py-2 rounded-md border text-sm font-medium"
                      style={{
                        borderColor: formData.rejectButtonColor,
                        color: formData.rejectButtonColor,
                      }}
                    >
                      {formData.rejectAllButtonText || 'Decline'}
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-medium underline"
                      style={{ color: formData.rejectButtonColor }}
                    >
                      {formData.customizeButtonText || 'Manage Preferences'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated Info */}
        {banner && (
          <div className="text-sm text-gray-500">
            Last updated: {new Date(banner.updatedAt).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
