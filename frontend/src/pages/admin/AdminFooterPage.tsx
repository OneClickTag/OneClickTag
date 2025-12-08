import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react';

interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

interface FooterLink {
  label: string;
  url: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface FooterConfig {
  id: string;
  brandName: string;
  brandDescription: string;
  socialLinks: SocialLink[];
  sections: FooterSection[];
  copyrightText: string;
}

const defaultConfig: FooterConfig = {
  id: 'default',
  brandName: 'OneClickTag',
  brandDescription: 'Simplify your conversion tracking with automated GTM and Google Ads integration.',
  socialLinks: [
    { platform: 'Twitter', url: 'https://twitter.com/oneclicktag', icon: 'twitter' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/company/oneclicktag', icon: 'linkedin' },
    { platform: 'GitHub', url: 'https://github.com/oneclicktag', icon: 'github' },
  ],
  sections: [
    {
      title: 'Product',
      links: [
        { label: 'Pricing', url: '/plans' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', url: '/about' },
        { label: 'Contact', url: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', url: '/terms' },
        { label: 'Privacy Policy', url: '/privacy' },
      ],
    },
  ],
  copyrightText: 'OneClickTag. All rights reserved.',
};

export function AdminFooterPage() {
  const [config, setConfig] = useState<FooterConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Save to localStorage for now (backend integration can be added later)
      localStorage.setItem('footer_config', JSON.stringify(config));
      setMessage({ type: 'success', text: 'Footer configuration saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save footer configuration.' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const saved = localStorage.getItem('footer_config');
        if (saved) {
          setConfig(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load footer config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const addSocialLink = () => {
    setConfig({
      ...config,
      socialLinks: [...config.socialLinks, { platform: '', url: '', icon: 'twitter' }],
    });
  };

  const removeSocialLink = (index: number) => {
    setConfig({
      ...config,
      socialLinks: config.socialLinks.filter((_, i) => i !== index),
    });
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...config.socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, socialLinks: updated });
  };

  const addSection = () => {
    setConfig({
      ...config,
      sections: [...config.sections, { title: '', links: [] }],
    });
  };

  const removeSection = (index: number) => {
    setConfig({
      ...config,
      sections: config.sections.filter((_, i) => i !== index),
    });
  };

  const updateSection = (index: number, field: keyof FooterSection, value: any) => {
    const updated = [...config.sections];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, sections: updated });
  };

  const addLink = (sectionIndex: number) => {
    const updated = [...config.sections];
    updated[sectionIndex].links.push({ label: '', url: '' });
    setConfig({ ...config, sections: updated });
  };

  const removeLink = (sectionIndex: number, linkIndex: number) => {
    const updated = [...config.sections];
    updated[sectionIndex].links = updated[sectionIndex].links.filter((_, i) => i !== linkIndex);
    setConfig({ ...config, sections: updated });
  };

  const updateLink = (sectionIndex: number, linkIndex: number, field: keyof FooterLink, value: string) => {
    const updated = [...config.sections];
    updated[sectionIndex].links[linkIndex] = {
      ...updated[sectionIndex].links[linkIndex],
      [field]: value,
    };
    setConfig({ ...config, sections: updated });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Footer Configuration</h1>
            <p className="text-gray-600 mt-2">Customize your website footer links and content</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Brand Settings */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Brand Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name</label>
              <input
                type="text"
                value={config.brandName}
                onChange={(e) => setConfig({ ...config, brandName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand Description</label>
              <textarea
                value={config.brandDescription}
                onChange={(e) => setConfig({ ...config, brandDescription: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Copyright Text</label>
              <input
                type="text"
                value={config.copyrightText}
                onChange={(e) => setConfig({ ...config, copyrightText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Social Links</h2>
            <Button onClick={addSocialLink} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Social Link
            </Button>
          </div>
          <div className="space-y-4">
            {config.socialLinks.map((social, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <input
                    type="text"
                    value={social.platform}
                    onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                    placeholder="e.g., Twitter"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                  <input
                    type="url"
                    value={social.url}
                    onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                  <select
                    value={social.icon}
                    onChange={(e) => updateSocialLink(index, 'icon', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="github">GitHub</option>
                  </select>
                </div>
                <Button onClick={() => removeSocialLink(index)} variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Sections */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Footer Sections</h2>
            <Button onClick={addSection} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>
          <div className="space-y-6">
            {config.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-center mb-4">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                    placeholder="Section Title"
                    className="text-lg font-semibold px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => addLink(sectionIndex)} variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Link
                    </Button>
                    <Button onClick={() => removeSection(sectionIndex)} variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <div key={linkIndex} className="flex gap-4 items-end ml-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => updateLink(sectionIndex, linkIndex, 'label', e.target.value)}
                          placeholder="Link label"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => updateLink(sectionIndex, linkIndex, 'url', e.target.value)}
                          placeholder="/page or https://..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <Button onClick={() => removeLink(sectionIndex, linkIndex)} variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
