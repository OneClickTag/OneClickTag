import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, RefreshCw, Eye, Layout } from 'lucide-react';
import {
  adminComplianceService,
  ConsentBanner,
  UpdateConsentBannerData,
} from '@/lib/api/services/admin/adminComplianceService';

export function CookieBannerPage() {
  const [banner, setBanner] = useState<ConsentBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<UpdateConsentBannerData>({
    headingText: '',
    bodyText: '',
    acceptAllButtonText: '',
    rejectAllButtonText: '',
    customizeButtonText: '',
    acceptButtonColor: '#3B82F6',
    rejectButtonColor: '#6B7280',
    textColor: '#1F2937',
    position: 'bottom',
    consentExpiryDays: 365,
  });

  const fetchBanner = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await adminComplianceService.getConsentBanner();
      setBanner(data);
      setFormData({
        headingText: data.headingText,
        bodyText: data.bodyText,
        acceptAllButtonText: data.acceptAllButtonText,
        rejectAllButtonText: data.rejectAllButtonText,
        customizeButtonText: data.customizeButtonText,
        acceptButtonColor: data.acceptButtonColor,
        rejectButtonColor: data.rejectButtonColor,
        textColor: data.textColor,
        position: data.position,
        consentExpiryDays: data.consentExpiryDays,
      });
    } catch (error: any) {
      console.error('Failed to fetch consent banner:', error);
      setMessage({ type: 'error', text: 'Failed to load consent banner settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanner();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await adminComplianceService.updateConsentBanner(formData);
      setMessage({ type: 'success', text: 'Consent banner settings saved successfully!' });
      fetchBanner();
    } catch (error: any) {
      console.error('Failed to save consent banner:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to save consent banner settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof UpdateConsentBannerData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading consent banner settings...</p>
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
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
            </Button>
            <Button variant="outline" onClick={fetchBanner} className="flex items-center space-x-2">
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

        {/* Preview Banner */}
        {showPreview && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Layout className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 relative">
              <div
                className="max-w-2xl mx-auto p-6 rounded-lg shadow-xl"
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: formData.acceptButtonColor,
                  borderWidth: '2px',
                }}
              >
                <h3 className="text-xl font-semibold mb-3" style={{ color: formData.textColor }}>
                  {formData.headingText}
                </h3>
                <p className="text-sm mb-4" style={{ color: formData.textColor, opacity: 0.8 }}>
                  {formData.bodyText}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-4 py-2 rounded-md font-medium text-white"
                    style={{ backgroundColor: formData.acceptButtonColor }}
                  >
                    {formData.acceptAllButtonText}
                  </button>
                  <button
                    className="px-4 py-2 rounded-md font-medium"
                    style={{
                      backgroundColor: formData.rejectButtonColor,
                      color: '#ffffff',
                    }}
                  >
                    {formData.rejectAllButtonText}
                  </button>
                  <button className="px-4 py-2 rounded-md font-medium underline" style={{ color: formData.textColor }}>
                    {formData.customizeButtonText}
                  </button>
                </div>
              </div>
              <div className="text-center mt-4 text-sm text-gray-500">
                Position: {formData.position} • Consent expires after {formData.consentExpiryDays} days
              </div>
            </div>
          </div>
        )}

        {/* Banner Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Banner Content</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="headingText">Heading Text *</Label>
              <Input
                id="headingText"
                value={formData.headingText}
                onChange={(e) => updateFormData('headingText', e.target.value)}
                placeholder="We use cookies"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="bodyText">Body Text *</Label>
              <Textarea
                id="bodyText"
                value={formData.bodyText}
                onChange={(e) => updateFormData('bodyText', e.target.value)}
                placeholder="We use cookies to improve your browsing experience and analyze site traffic..."
                rows={4}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="acceptAllButtonText">Accept Button Text *</Label>
                <Input
                  id="acceptAllButtonText"
                  value={formData.acceptAllButtonText}
                  onChange={(e) => updateFormData('acceptAllButtonText', e.target.value)}
                  placeholder="Accept All"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="rejectAllButtonText">Decline Button Text *</Label>
                <Input
                  id="rejectAllButtonText"
                  value={formData.rejectAllButtonText}
                  onChange={(e) => updateFormData('rejectAllButtonText', e.target.value)}
                  placeholder="Decline"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="customizeButtonText">Manage Preferences Text *</Label>
                <Input
                  id="customizeButtonText"
                  value={formData.customizeButtonText}
                  onChange={(e) => updateFormData('customizeButtonText', e.target.value)}
                  placeholder="Manage Preferences"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Banner Styling */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Banner Styling</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="acceptButtonColor">Primary Color *</Label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.acceptButtonColor}
                  onChange={(e) => updateFormData('acceptButtonColor', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.acceptButtonColor}
                  onChange={(e) => updateFormData('acceptButtonColor', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="rejectButtonColor">Secondary Color *</Label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.rejectButtonColor}
                  onChange={(e) => updateFormData('rejectButtonColor', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.rejectButtonColor}
                  onChange={(e) => updateFormData('rejectButtonColor', e.target.value)}
                  placeholder="#6B7280"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="textColor">Text Color *</Label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.textColor}
                  onChange={(e) => updateFormData('textColor', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.textColor}
                  onChange={(e) => updateFormData('textColor', e.target.value)}
                  placeholder="#1F2937"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Banner Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Banner Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="position">Position *</Label>
              <Select value={formData.position} onValueChange={(value: any) => updateFormData('position', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="center">Center (Modal)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Where the banner appears on the page</p>
            </div>
            <div>
              <Label htmlFor="consentExpiryDays">Consent Expiry (Days) *</Label>
              <Input
                id="consentExpiryDays"
                type="number"
                value={formData.consentExpiryDays}
                onChange={(e) => updateFormData('consentExpiryDays', parseInt(e.target.value) || 365)}
                placeholder="365"
                min="1"
                max="730"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">How long the user's consent choice is remembered (1-730 days)</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> The consent banner is displayed to users on their first visit. Configure the text and
            colors to match your brand. The consent choice is stored in the user's browser for the specified expiry
            period. Use the preview to see how your banner will look.
          </p>
        </div>

        {/* Last Updated Info */}
        {banner && (
          <div className="text-sm text-gray-500">
            Last updated:{' '}
            {new Date(banner.updatedAt).toLocaleString('en-US', {
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
