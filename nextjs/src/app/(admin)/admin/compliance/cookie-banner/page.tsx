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
import { FileCheck, Save, Loader2, RefreshCw, Eye } from 'lucide-react';

interface ConsentBannerSettings {
  id?: string;
  enabled?: boolean;
  title?: string;
  message?: string;
  acceptButtonText?: string;
  rejectButtonText?: string;
  settingsButtonText?: string;
  position?: 'bottom' | 'top' | 'center';
  showSettingsButton?: boolean;
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
}

export default function CookieBannerPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ConsentBannerSettings>({
    enabled: true,
    title: 'Cookie Consent',
    message: 'We use cookies to improve your experience on our site.',
    acceptButtonText: 'Accept All',
    rejectButtonText: 'Reject All',
    settingsButtonText: 'Customize',
    position: 'bottom',
    showSettingsButton: true,
    backgroundColor: '#ffffff',
    textColor: '#000000',
    buttonColor: '#3b82f6',
  });

  const { isLoading, refetch } = useQuery({
    queryKey: ['compliance', 'consent-banner'],
    queryFn: async () => {
      const settings = await api.get<ConsentBannerSettings>('/api/compliance/consent-banner');
      if (settings) {
        setFormData(settings);
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
                  <Label htmlFor="enabled" className="font-medium">Enable Cookie Banner</Label>
                  <p className="text-sm text-gray-500">Show cookie consent banner to visitors</p>
                </div>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
              </div>

              <div>
                <Label htmlFor="title">Banner Title</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Cookie Consent"
                />
              </div>

              <div>
                <Label htmlFor="message">Banner Message</Label>
                <Textarea
                  id="message"
                  value={formData.message || ''}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="We use cookies to improve your experience..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="position">Banner Position</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value: 'bottom' | 'top' | 'center') => setFormData({ ...formData, position: value })}
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
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="acceptButtonText">Accept Button</Label>
                  <Input
                    id="acceptButtonText"
                    value={formData.acceptButtonText || ''}
                    onChange={(e) => setFormData({ ...formData, acceptButtonText: e.target.value })}
                    placeholder="Accept All"
                  />
                </div>
                <div>
                  <Label htmlFor="rejectButtonText">Reject Button</Label>
                  <Input
                    id="rejectButtonText"
                    value={formData.rejectButtonText || ''}
                    onChange={(e) => setFormData({ ...formData, rejectButtonText: e.target.value })}
                    placeholder="Reject All"
                  />
                </div>
                <div>
                  <Label htmlFor="settingsButtonText">Settings Button</Label>
                  <Input
                    id="settingsButtonText"
                    value={formData.settingsButtonText || ''}
                    onChange={(e) => setFormData({ ...formData, settingsButtonText: e.target.value })}
                    placeholder="Customize"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="showSettingsButton"
                  checked={formData.showSettingsButton}
                  onCheckedChange={(checked) => setFormData({ ...formData, showSettingsButton: checked })}
                />
                <Label htmlFor="showSettingsButton">Show settings button</Label>
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
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2">
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
                  <div className="flex gap-2">
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
                  <Label htmlFor="buttonColor">Button Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="buttonColor"
                      type="color"
                      value={formData.buttonColor || '#3b82f6'}
                      onChange={(e) => setFormData({ ...formData, buttonColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.buttonColor || '#3b82f6'}
                      onChange={(e) => setFormData({ ...formData, buttonColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
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
