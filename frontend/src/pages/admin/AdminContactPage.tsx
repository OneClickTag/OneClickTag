import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw, Plus, Trash2, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { adminContactService, ContactPageContent, UpdateContactPageData } from '@/lib/api/services/admin';

interface SocialLink {
  platform: string;
  url: string;
}

interface FAQ {
  question: string;
  answer: string;
}

export function AdminContactPage() {
  const [content, setContent] = useState<ContactPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<UpdateContactPageData>({
    email: '',
    phone: '',
    address: '',
    businessHours: '',
    socialLinks: [],
    faqs: [],
    formSettings: {
      enableForm: true,
      emailTo: '',
      successMessage: 'Thank you for your message! We will get back to you soon.',
      subjects: ['General Inquiry', 'Technical Support', 'Sales', 'Partnership'],
    },
  });

  const fetchContent = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await adminContactService.getActive();
      console.log('Contact content received:', data);
      setContent(data);

      // Populate form with existing data
      setFormData({
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        businessHours: data.businessHours || '',
        socialLinks: data.socialLinks || [],
        faqs: data.faqs || [],
        formSettings: data.formSettings || {
          enableForm: true,
          emailTo: '',
          successMessage: 'Thank you for your message! We will get back to you soon.',
          subjects: ['General Inquiry', 'Technical Support', 'Sales', 'Partnership'],
        },
      });
    } catch (error: any) {
      console.error('Failed to fetch contact content:', error);
      console.error('Error details:', error?.response?.data);
      setMessage({ type: 'error', text: 'Failed to load contact content' });
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        alert('Access denied. Please logout and login again to refresh your permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleSave = async () => {
    if (!content?.id) {
      setMessage({ type: 'error', text: 'No contact content found to update' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      await adminContactService.update(content.id, formData);
      setMessage({ type: 'success', text: 'Contact content saved successfully!' });
      fetchContent();
    } catch (error: any) {
      console.error('Failed to save contact content:', error);
      console.error('Error details:', error?.response?.data);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to save contact content'
      });
    } finally {
      setSaving(false);
    }
  };

  // Social Links Handlers
  const addSocialLink = () => {
    setFormData(prev => ({
      ...prev,
      socialLinks: [...(prev.socialLinks || []), { platform: '', url: '' }],
    }));
  };

  const removeSocialLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: (prev.socialLinks || []).filter((_, i) => i !== index),
    }));
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    setFormData(prev => {
      const updated = [...(prev.socialLinks || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, socialLinks: updated };
    });
  };

  // FAQ Handlers
  const addFAQ = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: '', answer: '' }],
    }));
  };

  const removeFAQ = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index),
    }));
  };

  const updateFAQ = (index: number, field: keyof FAQ, value: string) => {
    setFormData(prev => {
      const updated = [...(prev.faqs || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, faqs: updated };
    });
  };

  // Form Settings Handlers
  const updateFormSettings = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      formSettings: {
        ...prev.formSettings,
        [field]: value,
      },
    }));
  };

  const addSubject = () => {
    const newSubject = prompt('Enter new subject:');
    if (newSubject && newSubject.trim()) {
      setFormData(prev => ({
        ...prev,
        formSettings: {
          ...prev.formSettings,
          subjects: [...(prev.formSettings?.subjects || []), newSubject.trim()],
        },
      }));
    }
  };

  const removeSubject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      formSettings: {
        ...prev.formSettings,
        subjects: (prev.formSettings?.subjects || []).filter((_, i) => i !== index),
      },
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading contact content...</p>
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
            <h2 className="text-2xl font-bold text-gray-900">Contact Page Content</h2>
            <p className="text-gray-600 mt-1">Manage contact information, social links, and FAQs</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchContent} className="flex items-center space-x-2">
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

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contact@oneclicktag.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St, City, State 12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Business Hours
              </label>
              <input
                type="text"
                value={formData.businessHours}
                onChange={(e) => setFormData(prev => ({ ...prev, businessHours: e.target.value }))}
                placeholder="Mon-Fri: 9am-5pm EST"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Social Links</h3>
            <Button onClick={addSocialLink} variant="outline" size="sm" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Link</span>
            </Button>
          </div>
          <div className="space-y-4">
            {formData.socialLinks && formData.socialLinks.length > 0 ? (
              formData.socialLinks.map((link, index) => (
                <div key={index} className="flex gap-4 items-end p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                    <input
                      type="text"
                      value={link.platform}
                      onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                      placeholder="Twitter, LinkedIn, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    onClick={() => removeSocialLink(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No social links added yet</p>
            )}
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h3>
            <Button onClick={addFAQ} variant="outline" size="sm" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add FAQ</span>
            </Button>
          </div>
          <div className="space-y-4">
            {formData.faqs && formData.faqs.length > 0 ? (
              formData.faqs.map((faq, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">FAQ #{index + 1}</span>
                    <Button
                      onClick={() => removeFAQ(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                        placeholder="What is your question?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
                      <textarea
                        value={faq.answer}
                        onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                        placeholder="Provide a detailed answer..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No FAQs added yet</p>
            )}
          </div>
        </div>

        {/* Form Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Form Settings</h3>
          <div className="space-y-6">
            {/* Enable Form Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-900">Enable Contact Form</label>
                <p className="text-xs text-gray-500 mt-1">Allow visitors to submit contact form</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.formSettings?.enableForm || false}
                  onChange={(e) => updateFormSettings('enableForm', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Email To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Send form submissions to</label>
              <input
                type="email"
                value={formData.formSettings?.emailTo || ''}
                onChange={(e) => updateFormSettings('emailTo', e.target.value)}
                placeholder="admin@oneclicktag.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Success Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Success Message</label>
              <textarea
                value={formData.formSettings?.successMessage || ''}
                onChange={(e) => updateFormSettings('successMessage', e.target.value)}
                placeholder="Thank you for your message!"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Subject Options */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Subject Options</label>
                <Button onClick={addSubject} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {formData.formSettings?.subjects && formData.formSettings.subjects.length > 0 ? (
                  formData.formSettings.subjects.map((subject, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="flex-1 text-sm text-gray-900">{subject}</span>
                      <Button
                        onClick={() => removeSubject(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-2">No subjects added</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Contact information, social links, and FAQs will be displayed on the contact page.
            Form submissions will be sent to the email address specified in form settings.
            Add relevant social media platforms and common questions to help visitors reach you.
          </p>
        </div>

        {/* Last Updated Info */}
        {content && (
          <div className="text-sm text-gray-500">
            Last updated: {new Date(content.updatedAt).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {content.updatedBy && ` by ${content.updatedBy}`}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
