'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, Loader2, RefreshCw, Shield } from 'lucide-react';

interface ComplianceSettings {
  id?: string;
  gdprEnabled?: boolean;
  ccpaEnabled?: boolean;
  cookieConsentRequired?: boolean;
  dataRetentionDays?: number;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  dpoEmail?: string;
}

export default function ComplianceSettingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ComplianceSettings>({
    gdprEnabled: true,
    ccpaEnabled: true,
    cookieConsentRequired: true,
    dataRetentionDays: 365,
    privacyPolicyUrl: '',
    termsOfServiceUrl: '',
    dpoEmail: '',
  });

  const { isLoading, refetch } = useQuery({
    queryKey: ['compliance', 'settings'],
    queryFn: async () => {
      const settings = await api.get<ComplianceSettings>('/api/compliance/settings');
      if (settings) {
        setFormData(settings);
      }
      return settings;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: ComplianceSettings) =>
      api.put('/api/compliance/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'settings'] });
      alert('Compliance settings saved successfully!');
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
          <h2 className="text-2xl font-bold text-gray-900">Compliance Settings</h2>
          <p className="text-gray-600 mt-1">Configure GDPR, CCPA, and privacy compliance</p>
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
          {/* Privacy Regulations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy Regulations
              </CardTitle>
              <CardDescription>
                Enable compliance features for different regulations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="gdprEnabled" className="font-medium">GDPR Compliance</Label>
                  <p className="text-sm text-gray-500">European Union data protection</p>
                </div>
                <Switch
                  id="gdprEnabled"
                  checked={formData.gdprEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, gdprEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ccpaEnabled" className="font-medium">CCPA Compliance</Label>
                  <p className="text-sm text-gray-500">California Consumer Privacy Act</p>
                </div>
                <Switch
                  id="ccpaEnabled"
                  checked={formData.ccpaEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, ccpaEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="cookieConsentRequired" className="font-medium">Cookie Consent Required</Label>
                  <p className="text-sm text-gray-500">Require explicit consent before setting cookies</p>
                </div>
                <Switch
                  id="cookieConsentRequired"
                  checked={formData.cookieConsentRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, cookieConsentRequired: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Configure data retention and privacy policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dataRetentionDays">Data Retention Period (days)</Label>
                <Input
                  id="dataRetentionDays"
                  type="number"
                  value={formData.dataRetentionDays || 365}
                  onChange={(e) => setFormData({ ...formData, dataRetentionDays: parseInt(e.target.value) })}
                  min={30}
                  max={3650}
                />
              </div>
              <div>
                <Label htmlFor="privacyPolicyUrl">Privacy Policy URL</Label>
                <Input
                  id="privacyPolicyUrl"
                  value={formData.privacyPolicyUrl || ''}
                  onChange={(e) => setFormData({ ...formData, privacyPolicyUrl: e.target.value })}
                  placeholder="https://example.com/privacy"
                />
              </div>
              <div>
                <Label htmlFor="termsOfServiceUrl">Terms of Service URL</Label>
                <Input
                  id="termsOfServiceUrl"
                  value={formData.termsOfServiceUrl || ''}
                  onChange={(e) => setFormData({ ...formData, termsOfServiceUrl: e.target.value })}
                  placeholder="https://example.com/terms"
                />
              </div>
              <div>
                <Label htmlFor="dpoEmail">Data Protection Officer Email</Label>
                <Input
                  id="dpoEmail"
                  type="email"
                  value={formData.dpoEmail || ''}
                  onChange={(e) => setFormData({ ...formData, dpoEmail: e.target.value })}
                  placeholder="dpo@example.com"
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
              Save Settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
