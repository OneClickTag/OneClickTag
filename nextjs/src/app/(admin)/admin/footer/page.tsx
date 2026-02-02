'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Save, Loader2, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Available social icon options that match the Footer component
const AVAILABLE_ICONS = [
  { value: 'twitter', label: 'Twitter' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
];

interface FooterLink {
  label: string;
  url: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  platform: string;
  url: string;
  icon?: string;
}

interface FooterSettings {
  id?: string;
  brandName?: string;
  brandDescription?: string;
  copyrightText?: string;
  sections?: FooterSection[];
  socialLinks?: SocialLink[];
  isActive?: boolean;
}

export default function AdminFooterPage() {
  const api = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FooterSettings>({
    brandName: '',
    brandDescription: '',
    copyrightText: '',
    sections: [],
    socialLinks: [],
  });

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'footer-content'],
    queryFn: async () => {
      const footer = await api.get<FooterSettings>('/api/admin/footer-content');
      console.log('[AdminFooter] Loaded footer data:', footer);
      if (footer) {
        setFormData({
          ...footer,
          sections: footer.sections || [],
          socialLinks: footer.socialLinks || [],
        });
      }
      return footer;
    },
    enabled: !!user, // Only fetch when user is authenticated
    retry: 1, // Retry once on failure
  });

  // Show error state if query failed
  if (error) {
    console.error('[AdminFooter] Error loading footer:', error);
  }

  const saveMutation = useMutation({
    mutationFn: (data: FooterSettings) =>
      api.put('/api/admin/footer-content', data),
    onSuccess: () => {
      // Invalidate both admin and public footer queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'footer-content'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'footer'] });
      alert('Footer settings saved successfully!');
    },
    onError: (error) => {
      console.error('[AdminFooter] Error saving footer:', error);
      alert(`Failed to save footer settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const addSection = () => {
    setFormData({
      ...formData,
      sections: [...(formData.sections || []), { title: '', links: [] }],
    });
  };

  const removeSection = (index: number) => {
    setFormData({
      ...formData,
      sections: formData.sections?.filter((_, i) => i !== index) || [],
    });
  };

  const updateSectionTitle = (index: number, title: string) => {
    const newSections = [...(formData.sections || [])];
    newSections[index] = { ...newSections[index], title };
    setFormData({ ...formData, sections: newSections });
  };

  const addLinkToSection = (sectionIndex: number) => {
    const newSections = [...(formData.sections || [])];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      links: [...(newSections[sectionIndex].links || []), { label: '', url: '' }],
    };
    setFormData({ ...formData, sections: newSections });
  };

  const removeLinkFromSection = (sectionIndex: number, linkIndex: number) => {
    const newSections = [...(formData.sections || [])];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      links: newSections[sectionIndex].links.filter((_, i) => i !== linkIndex),
    };
    setFormData({ ...formData, sections: newSections });
  };

  const updateLink = (sectionIndex: number, linkIndex: number, field: 'label' | 'url', value: string) => {
    const newSections = [...(formData.sections || [])];
    const newLinks = [...newSections[sectionIndex].links];
    newLinks[linkIndex] = { ...newLinks[linkIndex], [field]: value };
    newSections[sectionIndex] = { ...newSections[sectionIndex], links: newLinks };
    setFormData({ ...formData, sections: newSections });
  };

  const addSocialLink = () => {
    setFormData({
      ...formData,
      socialLinks: [...(formData.socialLinks || []), { platform: '', url: '', icon: 'twitter' }],
    });
  };

  const removeSocialLink = (index: number) => {
    setFormData({
      ...formData,
      socialLinks: formData.socialLinks?.filter((_, i) => i !== index) || [],
    });
  };

  const updateSocialLink = (index: number, field: 'platform' | 'url' | 'icon', value: string) => {
    const newSocialLinks = [...(formData.socialLinks || [])];
    newSocialLinks[index] = { ...newSocialLinks[index], [field]: value };
    setFormData({ ...formData, socialLinks: newSocialLinks });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Footer Settings</h2>
          <p className="text-gray-600 mt-1">Customize your website footer content</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading || !user ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load footer settings: {error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-2">
            Try Again
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Footer Content
              </CardTitle>
              <CardDescription>
                Configure the footer text and branding
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
                  <Label htmlFor="copyrightText">Copyright Text</Label>
                  <Input
                    id="copyrightText"
                    value={formData.copyrightText || ''}
                    onChange={(e) => setFormData({ ...formData, copyrightText: e.target.value })}
                    placeholder="© 2024 OneClickTag. All rights reserved."
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="brandDescription">Brand Description</Label>
                <Textarea
                  id="brandDescription"
                  value={formData.brandDescription || ''}
                  onChange={(e) => setFormData({ ...formData, brandDescription: e.target.value })}
                  placeholder="A short description of your brand..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Footer Sections */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Footer Sections</CardTitle>
                  <CardDescription>
                    Add link sections to your footer
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSection}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.sections?.map((section, sectionIndex) => (
                <div key={sectionIndex} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Section Title (e.g., Company, Resources)"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSection(sectionIndex)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="pl-4 space-y-2">
                    {section.links?.map((link, linkIndex) => (
                      <div key={linkIndex} className="flex gap-2 items-center">
                        <Input
                          placeholder="Label"
                          value={link.label}
                          onChange={(e) => updateLink(sectionIndex, linkIndex, 'label', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="URL"
                          value={link.url}
                          onChange={(e) => updateLink(sectionIndex, linkIndex, 'url', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLinkFromSection(sectionIndex, linkIndex)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addLinkToSection(sectionIndex)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Link
                    </Button>
                  </div>
                </div>
              ))}
              {(!formData.sections || formData.sections.length === 0) && (
                <p className="text-sm text-gray-500 py-2 text-center">No sections added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Social Links</CardTitle>
                  <CardDescription>
                    Add social media links to your footer
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSocialLink}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Social Link
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.socialLinks?.map((social, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Select
                    value={social.icon || 'twitter'}
                    onValueChange={(value) => updateSocialLink(index, 'icon', value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ICONS.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>
                          {icon.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Platform name (e.g., Twitter)"
                    value={social.platform}
                    onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="URL (e.g., https://twitter.com/...)"
                    value={social.url}
                    onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSocialLink(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {(!formData.socialLinks || formData.socialLinks.length === 0) && (
                <p className="text-sm text-gray-500 py-2 text-center">No social links added yet. Click &quot;Add Social Link&quot; to get started.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
