'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Mail,
  Save,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  GripVertical,
  MessageSquare,
  Phone,
  HelpCircle,
  MapPin,
  Clock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Globe,
  Building,
} from 'lucide-react';

// Contact info field type definitions
type ContactFieldType = 'email' | 'phone' | 'address' | 'hours' | 'website' | 'custom';

interface ContactInfoField {
  id: string;
  type: ContactFieldType;
  label: string;
  value: string;
  enabled: boolean;
  order: number;
  icon?: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface ContactSettings {
  id?: string;
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  faqs?: FAQ[];
  formSettings?: {
    enableForm?: boolean;
    subjects?: string[];
    successMessage?: string;
  };
  contactFields?: ContactInfoField[];
  customContent?: Record<string, unknown>;
  isActive?: boolean;
}

// Field type metadata
const fieldTypes: Record<ContactFieldType, { label: string; icon: React.ElementType; placeholder: string }> = {
  email: { label: 'Email', icon: Mail, placeholder: 'contact@example.com' },
  phone: { label: 'Phone', icon: Phone, placeholder: '+1 (555) 123-4567' },
  address: { label: 'Address', icon: MapPin, placeholder: '123 Business St, City, State' },
  hours: { label: 'Business Hours', icon: Clock, placeholder: 'Mon-Fri: 9am-5pm' },
  website: { label: 'Website', icon: Globe, placeholder: 'https://example.com' },
  custom: { label: 'Custom', icon: Building, placeholder: 'Custom information' },
};

// Default contact fields
const getDefaultContactFields = (): ContactInfoField[] => [
  { id: 'email-1', type: 'email', label: 'Email', value: '', enabled: true, order: 0 },
  { id: 'phone-1', type: 'phone', label: 'Phone', value: '', enabled: true, order: 1 },
  { id: 'address-1', type: 'address', label: 'Office', value: '', enabled: true, order: 2 },
  { id: 'hours-1', type: 'hours', label: 'Business Hours', value: '', enabled: true, order: 3 },
];

export default function AdminContactPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ContactSettings>({
    faqs: [],
    formSettings: {
      enableForm: true,
      subjects: ['General Inquiry', 'Sales Question', 'Technical Support', 'Partnership Opportunity', 'Other'],
      successMessage: "Thank you for contacting us. We'll get back to you within 24 hours.",
    },
    contactFields: getDefaultContactFields(),
  });

  const { isLoading, refetch } = useQuery({
    queryKey: ['admin', 'contact-page'],
    queryFn: async () => {
      const contact = await api.get<ContactSettings>('/api/admin/contact-page');
      if (contact) {
        // Build contactFields from existing data or customContent
        const customContent = (contact.customContent as Record<string, unknown>) || {};
        let contactFields = customContent.contactFields as ContactInfoField[] | undefined;

        // If no contactFields saved, build from legacy fields
        if (!contactFields || contactFields.length === 0) {
          contactFields = [];
          if (contact.email) {
            contactFields.push({ id: 'email-1', type: 'email', label: 'Email', value: contact.email, enabled: true, order: 0 });
          }
          if (contact.phone) {
            contactFields.push({ id: 'phone-1', type: 'phone', label: 'Phone', value: contact.phone, enabled: true, order: 1 });
          }
          if (contact.address) {
            contactFields.push({ id: 'address-1', type: 'address', label: 'Office', value: contact.address, enabled: true, order: 2 });
          }
          if (contact.businessHours) {
            contactFields.push({ id: 'hours-1', type: 'hours', label: 'Business Hours', value: contact.businessHours, enabled: true, order: 3 });
          }
          // If still empty, use defaults
          if (contactFields.length === 0) {
            contactFields = getDefaultContactFields();
          }
        }

        setFormData({
          ...contact,
          faqs: contact.faqs || [],
          formSettings: contact.formSettings || {
            enableForm: true,
            subjects: ['General Inquiry', 'Sales Question', 'Technical Support', 'Partnership Opportunity', 'Other'],
          },
          contactFields,
        });
      }
      return contact;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: ContactSettings) => api.put('/api/admin/contact-page', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contact-page'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'contact'] });
      alert('Contact page settings saved successfully!');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Extract legacy fields from contactFields for backward compatibility
    const emailField = formData.contactFields?.find(f => f.type === 'email' && f.enabled);
    const phoneField = formData.contactFields?.find(f => f.type === 'phone' && f.enabled);
    const addressField = formData.contactFields?.find(f => f.type === 'address' && f.enabled);
    const hoursField = formData.contactFields?.find(f => f.type === 'hours' && f.enabled);

    const dataToSave = {
      ...formData,
      email: emailField?.value || '',
      phone: phoneField?.value || '',
      address: addressField?.value || '',
      businessHours: hoursField?.value || '',
      customContent: {
        ...(formData.customContent || {}),
        contactFields: formData.contactFields,
      },
    };

    saveMutation.mutate(dataToSave);
  };

  // Contact field management
  const addContactField = (type: ContactFieldType) => {
    const newField: ContactInfoField = {
      id: `${type}-${Date.now()}`,
      type,
      label: type === 'custom' ? 'Custom Field' : fieldTypes[type].label,
      value: '',
      enabled: true,
      order: formData.contactFields?.length || 0,
    };
    setFormData((prev) => ({
      ...prev,
      contactFields: [...(prev.contactFields || []), newField],
    }));
  };

  const removeContactField = (fieldId: string) => {
    if (confirm('Are you sure you want to remove this field?')) {
      setFormData((prev) => ({
        ...prev,
        contactFields: prev.contactFields?.filter((f) => f.id !== fieldId),
      }));
    }
  };

  const toggleFieldEnabled = (fieldId: string) => {
    setFormData((prev) => ({
      ...prev,
      contactFields: prev.contactFields?.map((f) =>
        f.id === fieldId ? { ...f, enabled: !f.enabled } : f
      ),
    }));
  };

  const updateFieldValue = (fieldId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contactFields: prev.contactFields?.map((f) =>
        f.id === fieldId ? { ...f, value } : f
      ),
    }));
  };

  const updateFieldLabel = (fieldId: string, label: string) => {
    setFormData((prev) => ({
      ...prev,
      contactFields: prev.contactFields?.map((f) =>
        f.id === fieldId ? { ...f, label } : f
      ),
    }));
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const fields = [...(formData.contactFields || [])];
    const index = fields.findIndex((f) => f.id === fieldId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
    fields.forEach((field, i) => (field.order = i));

    setFormData((prev) => ({ ...prev, contactFields: fields }));
  };

  // FAQ management
  const addFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: '', answer: '' }],
    }));
  };

  const removeFaq = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs?.filter((_, i) => i !== index),
    }));
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs?.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq)),
    }));
  };

  // Subject management
  const addSubject = () => {
    setFormData((prev) => ({
      ...prev,
      formSettings: {
        ...prev.formSettings,
        subjects: [...(prev.formSettings?.subjects || []), ''],
      },
    }));
  };

  const removeSubject = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      formSettings: {
        ...prev.formSettings,
        subjects: prev.formSettings?.subjects?.filter((_, i) => i !== index),
      },
    }));
  };

  const updateSubject = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      formSettings: {
        ...prev.formSettings,
        subjects: prev.formSettings?.subjects?.map((s, i) => (i === index ? value : s)),
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contact Page Settings</h2>
          <p className="text-gray-600 mt-1">Manage contact page content and layout</p>
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
          {/* Contact Information Fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>
                    Add, remove, reorder, and enable/disable contact info fields
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(fieldTypes).map(([type, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <Button
                        key={type}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addContactField(type as ContactFieldType)}
                        title={`Add ${meta.label}`}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        <Icon className="w-4 h-4 mr-1" />
                        {meta.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.contactFields?.sort((a, b) => a.order - b.order).map((field, index) => {
                const FieldIcon = fieldTypes[field.type]?.icon || Building;
                return (
                  <div
                    key={field.id}
                    className={`border rounded-lg p-4 transition-all ${
                      field.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-move flex-shrink-0" />

                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FieldIcon className="w-5 h-5 text-white" />
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                            placeholder="Field label"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Value</Label>
                          <Input
                            value={field.value}
                            onChange={(e) => updateFieldValue(field.id, e.target.value)}
                            placeholder={fieldTypes[field.type]?.placeholder || 'Enter value'}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Move buttons */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveField(field.id, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveField(field.id, 'down')}
                          disabled={index === (formData.contactFields?.length || 0) - 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>

                        {/* Enable/Disable toggle */}
                        <div className="flex items-center gap-2 px-2">
                          {field.enabled ? (
                            <Eye className="w-4 h-4 text-green-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                          <Switch
                            checked={field.enabled}
                            onCheckedChange={() => toggleFieldEnabled(field.id)}
                          />
                        </div>

                        {/* Delete */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeContactField(field.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {(!formData.contactFields || formData.contactFields.length === 0) && (
                <p className="text-sm text-gray-500 py-8 text-center">
                  No contact fields added yet. Click a button above to add one.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Form Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Form Settings
                  </CardTitle>
                  <CardDescription>
                    Configure the contact form options
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSubject}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Subject
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Success Message</Label>
                <Input
                  value={formData.formSettings?.successMessage || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      formSettings: { ...formData.formSettings, successMessage: e.target.value },
                    })
                  }
                  placeholder="Thank you for contacting us..."
                />
              </div>
              <div>
                <Label className="mb-2 block">Subject Options</Label>
                <div className="space-y-2">
                  {formData.formSettings?.subjects?.map((subject, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={subject}
                        onChange={(e) => updateSubject(index, e.target.value)}
                        placeholder="Subject option"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSubject(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Frequently Asked Questions
                  </CardTitle>
                  <CardDescription>
                    Add FAQ items to help visitors
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addFaq}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.faqs?.map((faq, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label>Question</Label>
                        <Input
                          value={faq.question}
                          onChange={(e) => updateFaq(index, 'question', e.target.value)}
                          placeholder="What is your question?"
                        />
                      </div>
                      <div>
                        <Label>Answer</Label>
                        <Textarea
                          value={faq.answer}
                          onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                          placeholder="Provide a helpful answer..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFaq(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!formData.faqs || formData.faqs.length === 0) && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No FAQs added yet. Click &quot;Add FAQ&quot; to create one.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending} size="lg">
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save All Changes
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
