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
import { FileCheck, Save, Loader2, RefreshCw, Eye, Settings, Shield } from 'lucide-react';

interface ConsentBannerSettings {
  id?: string;
  isActive?: boolean;
  headingText?: string;
  bodyText?: string;
  acceptAllButtonText?: string;
  rejectAllButtonText?: string;
  customizeButtonText?: string;
  savePreferencesText?: string;
  position?: string;
  backgroundColor?: string;
  textColor?: string;
  acceptButtonColor?: string;
  rejectButtonColor?: string;
  customizeButtonColor?: string;
  consentExpiryDays?: number;
  showOnEveryPage?: boolean;
  blockCookiesUntilConsent?: boolean;
  privacyPolicyUrl?: string;
  cookiePolicyUrl?: string;
}

export default function CookieBannerPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ConsentBannerSettings>({
    isActive: true,
    headingText: 'We value your privacy',
    bodyText: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
    acceptAllButtonText: 'Accept All',
    rejectAllButtonText: 'Reject All',
    customizeButtonText: 'Customize',
    savePreferencesText: 'Save Preferences',
    position: 'bottom',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    acceptButtonColor: '#3b82f6',
    rejectButtonColor: '#6b7280',
    customizeButtonColor: '#6b7280',
    consentExpiryDays: 365,
    showOnEveryPage: false,
    blockCookiesUntilConsent: true,
    privacyPolicyUrl: '/privacy',
    cookiePolicyUrl: '/cookie-policy',
  });

  const { isLoading, refetch } = useQuery({
    queryKey: ['compliance', 'consent-banner'],
    queryFn: async () => {
      const settings = await api.get<ConsentBannerSettings>('/api/compliance/consent-banner');
      if (settings) {
        setFormData((prev) => ({ ...prev, ...settings }));
      }
      return settings;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: ConsentBannerSettings) =>
      api.put('/api/compliance/consent-banner', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'consent-banner'] });
      alert('Cookie banner settings saved successfully!');
    },
    onError: (error: Error) => {
      alert(`Error saving settings: ${error.message}`);
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
          <h2 className="text-2xl font-bold text-gray-900">Cookie Banner</h2>
          <p className="text-gray-600 mt-1">Customize the cookie consent banner</p>
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
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Banner Settings
              </CardTitle>
              <CardDescription>
                Configure the cookie consent banner appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive" className="font-medium">Enable Cookie Banner</Label>
                  <p className="text-sm text-gray-500">Show cookie consent banner to visitors</p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div>
                <Label htmlFor="headingText">Banner Title</Label>
                <Input
                  id="headingText"
                  value={formData.headingText || ''}
                  onChange={(e) => setFormData({ ...formData, headingText: e.target.value })}
                  placeholder="Cookie Consent"
                />
              </div>

              <div>
                <Label htmlFor="bodyText">Banner Message</Label>
                <Textarea
                  id="bodyText"
                  value={formData.bodyText || ''}
                  onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                  placeholder="We use cookies to improve your experience..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="position">Banner Position</Label>
                <Select
                  value={formData.position || 'bottom'}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom">Bottom</SelectItem>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="center">Center (Modal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Button Text */}
          <Card>
            <CardHeader>
              <CardTitle>Button Labels</CardTitle>
              <CardDescription>
                Customize the text on consent buttons
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="acceptAllButtonText">Accept Button</Label>
                  <Input
                    id="acceptAllButtonText"
                    value={formData.acceptAllButtonText || ''}
                    onChange={(e) => setFormData({ ...formData, acceptAllButtonText: e.target.value })}
                    placeholder="Accept All"
                  />
                </div>
                <div>
                  <Label htmlFor="rejectAllButtonText">Reject Button</Label>
                  <Input
                    id="rejectAllButtonText"
                    value={formData.rejectAllButtonText || ''}
                    onChange={(e) => setFormData({ ...formData, rejectAllButtonText: e.target.value })}
                    placeholder="Reject All"
                  />
                </div>
                <div>
                  <Label htmlFor="customizeButtonText">Customize Button</Label>
                  <Input
                    id="customizeButtonText"
                    value={formData.customizeButtonText || ''}
                    onChange={(e) => setFormData({ ...formData, customizeButtonText: e.target.value })}
                    placeholder="Customize"
                  />
                </div>
                <div>
                  <Label htmlFor="savePreferencesText">Save Preferences Button</Label>
                  <Input
                    id="savePreferencesText"
                    value={formData.savePreferencesText || ''}
                    onChange={(e) => setFormData({ ...formData, savePreferencesText: e.target.value })}
                    placeholder="Save Preferences"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize colors to match your brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={formData.backgroundColor || '#ffffff'}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.backgroundColor || '#ffffff'}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="textColor"
                      type="color"
                      value={formData.textColor || '#000000'}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.textColor || '#000000'}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="acceptButtonColor">Accept Button Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="acceptButtonColor"
                      type="color"
                      value={formData.acceptButtonColor || '#3b82f6'}
                      onChange={(e) => setFormData({ ...formData, acceptButtonColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.acceptButtonColor || '#3b82f6'}
                      onChange={(e) => setFormData({ ...formData, acceptButtonColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="rejectButtonColor">Reject Button Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="rejectButtonColor"
                      type="color"
                      value={formData.rejectButtonColor || '#6b7280'}
                      onChange={(e) => setFormData({ ...formData, rejectButtonColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.rejectButtonColor || '#6b7280'}
                      onChange={(e) => setFormData({ ...formData, rejectButtonColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Behavior Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Behavior
              </CardTitle>
              <CardDescription>
                Configure consent behavior settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="consentExpiryDays">Consent Expiry (Days)</Label>
                  <Input
                    id="consentExpiryDays"
                    type="number"
                    min="1"
                    max="395"
                    value={formData.consentExpiryDays || 365}
                    onChange={(e) => setFormData({ ...formData, consentExpiryDays: parseInt(e.target.value) || 365 })}
                    placeholder="365"
                  />
                  <p className="text-xs text-gray-500 mt-1">How long until consent expires (1-395 days)</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showOnEveryPage"
                      checked={formData.showOnEveryPage}
                      onCheckedChange={(checked) => setFormData({ ...formData, showOnEveryPage: checked })}
                    />
                    <Label htmlFor="showOnEveryPage">Show on every page load</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="blockCookiesUntilConsent"
                      checked={formData.blockCookiesUntilConsent}
                      onCheckedChange={(checked) => setFormData({ ...formData, blockCookiesUntilConsent: checked })}
                    />
                    <Label htmlFor="blockCookiesUntilConsent">Block cookies until consent</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Policy Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Policy Links
              </CardTitle>
              <CardDescription>
                Links to your privacy and cookie policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="privacyPolicyUrl">Privacy Policy URL</Label>
                  <Input
                    id="privacyPolicyUrl"
                    value={formData.privacyPolicyUrl || ''}
                    onChange={(e) => setFormData({ ...formData, privacyPolicyUrl: e.target.value })}
                    placeholder="/privacy"
                  />
                </div>
                <div>
                  <Label htmlFor="cookiePolicyUrl">Cookie Policy URL</Label>
                  <Input
                    id="cookiePolicyUrl"
                    value={formData.cookiePolicyUrl || ''}
                    onChange={(e) => setFormData({ ...formData, cookiePolicyUrl: e.target.value })}
                    placeholder="/cookie-policy"
                  />
                </div>
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
