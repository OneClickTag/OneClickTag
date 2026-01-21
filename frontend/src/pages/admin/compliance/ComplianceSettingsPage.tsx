import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, RefreshCw, Building2, Shield } from 'lucide-react';
import {
  adminComplianceService,
  ComplianceSettings,
  UpdateComplianceSettingsData,
} from '@/lib/api/services/admin/adminComplianceService';

export function ComplianceSettingsPage() {
  const [settings, setSettings] = useState<ComplianceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<UpdateComplianceSettingsData>({
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    dpoName: '',
    dpoEmail: '',
    dpoPhone: '',
    privacyPolicyUrl: '',
    termsOfServiceUrl: '',
    ccpaTollFreeNumber: '',
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await adminComplianceService.getSettings();
      setSettings(data);
      setFormData({
        companyName: data.companyName || '',
        companyAddress: data.companyAddress || '',
        companyEmail: data.companyEmail || '',
        dpoName: data.dpoName || '',
        dpoEmail: data.dpoEmail || '',
        dpoPhone: data.dpoPhone || '',
        privacyPolicyUrl: data.privacyPolicyUrl || '',
        termsOfServiceUrl: data.termsOfServiceUrl || '',
        ccpaTollFreeNumber: data.ccpaTollFreeNumber || '',
      });
    } catch (error: any) {
      console.error('Failed to fetch compliance settings:', error);
      setMessage({ type: 'error', text: 'Failed to load compliance settings' });
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
      await adminComplianceService.updateSettings(formData);
      setMessage({ type: 'success', text: 'Compliance settings saved successfully!' });
      fetchSettings();
    } catch (error: any) {
      console.error('Failed to save compliance settings:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to save compliance settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof UpdateComplianceSettingsData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading compliance settings...</p>
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
            <h2 className="text-2xl font-bold text-gray-900">Compliance Settings</h2>
            <p className="text-gray-600 mt-1">Manage company information and data protection officer details</p>
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

        {/* Company Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Building2 className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="companyName" className="text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </Label>
              <Input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={(e) => updateFormData('companyName', e.target.value)}
                placeholder="Your Company Name"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="companyEmail" className="text-sm font-medium text-gray-700 mb-2">
                Company Email *
              </Label>
              <Input
                id="companyEmail"
                type="email"
                value={formData.companyEmail}
                onChange={(e) => updateFormData('companyEmail', e.target.value)}
                placeholder="contact@company.com"
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="companyAddress" className="text-sm font-medium text-gray-700 mb-2">
                Company Address *
              </Label>
              <Textarea
                id="companyAddress"
                value={formData.companyAddress}
                onChange={(e) => updateFormData('companyAddress', e.target.value)}
                placeholder="123 Main Street, City, State, Zip Code, Country"
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Data Protection Officer (DPO) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Data Protection Officer (DPO)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="dpoName" className="text-sm font-medium text-gray-700 mb-2">
                DPO Name *
              </Label>
              <Input
                id="dpoName"
                type="text"
                value={formData.dpoName}
                onChange={(e) => updateFormData('dpoName', e.target.value)}
                placeholder="John Doe"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="dpoEmail" className="text-sm font-medium text-gray-700 mb-2">
                DPO Email *
              </Label>
              <Input
                id="dpoEmail"
                type="email"
                value={formData.dpoEmail}
                onChange={(e) => updateFormData('dpoEmail', e.target.value)}
                placeholder="dpo@company.com"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="dpoPhone" className="text-sm font-medium text-gray-700 mb-2">
                DPO Phone
              </Label>
              <Input
                id="dpoPhone"
                type="tel"
                value={formData.dpoPhone}
                onChange={(e) => updateFormData('dpoPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Legal URLs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Legal Documents</h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <Label htmlFor="privacyPolicyUrl" className="text-sm font-medium text-gray-700 mb-2">
                Privacy Policy URL
              </Label>
              <Input
                id="privacyPolicyUrl"
                type="url"
                value={formData.privacyPolicyUrl}
                onChange={(e) => updateFormData('privacyPolicyUrl', e.target.value)}
                placeholder="https://company.com/privacy-policy"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="termsOfServiceUrl" className="text-sm font-medium text-gray-700 mb-2">
                Terms of Service URL
              </Label>
              <Input
                id="termsOfServiceUrl"
                type="url"
                value={formData.termsOfServiceUrl}
                onChange={(e) => updateFormData('termsOfServiceUrl', e.target.value)}
                placeholder="https://company.com/terms-of-service"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="ccpaTollFreeNumber" className="text-sm font-medium text-gray-700 mb-2">
                CCPA Toll-Free Number
              </Label>
              <Input
                id="ccpaTollFreeNumber"
                type="tel"
                value={formData.ccpaTollFreeNumber}
                onChange={(e) => updateFormData('ccpaTollFreeNumber', e.target.value)}
                placeholder="1-800-XXX-XXXX"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for CCPA compliance (California residents)
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> These settings are required for GDPR and CCPA compliance. Fields marked with * are
            mandatory. This information will be used in privacy notices, consent banners, and data subject request
            handling.
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
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
