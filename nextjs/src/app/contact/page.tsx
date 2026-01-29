'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import {
  Mail,
  MessageSquare,
  Send,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  Loader2,
  Globe,
  Building,
  type LucideIcon,
} from 'lucide-react';

// Type definitions
type ContactFieldType = 'email' | 'phone' | 'address' | 'hours' | 'website' | 'custom';

interface ContactInfoField {
  id: string;
  type: ContactFieldType;
  label: string;
  value: string;
  enabled: boolean;
  order: number;
}

interface ContentBlock {
  id: string;
  type: 'hero' | 'contact-info' | 'contact-form' | 'faqs' | 'custom-text';
  title: string;
  enabled: boolean;
  order: number;
  content: Record<string, unknown>;
}

// Map field types to icons
const fieldTypeIcons: Record<ContactFieldType, LucideIcon> = {
  email: Mail,
  phone: Phone,
  address: MapPin,
  hours: Clock,
  website: Globe,
  custom: Building,
};

interface FAQ {
  question: string;
  answer: string;
}

interface FormSettings {
  enableForm?: boolean;
  emailTo?: string;
  successMessage?: string;
  subjects?: string[];
}

interface ContactPageData {
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  faqs?: FAQ[];
  formSettings?: FormSettings;
  contentBlocks?: ContentBlock[];
  contactFields?: ContactInfoField[];
  customContent?: Record<string, unknown>;
}

// Fallback/default values
const defaultContactInfo = {
  email: 'hello@oneclicktag.com',
  phone: '+1 (555) 123-4567',
  address: 'San Francisco, CA',
  businessHours: 'Mon-Fri: 9AM-6PM PST',
};

const defaultFaqs: FAQ[] = [
  {
    question: 'What is your response time?',
    answer: 'We typically respond to all inquiries within 24 hours during business days.',
  },
  {
    question: 'Do you offer phone support?',
    answer: 'Yes! Phone support is available for all paid plans. Contact us to schedule a call.',
  },
  {
    question: 'Can I schedule a demo?',
    answer: 'Absolutely! Choose "Sales Question" as your subject and mention demo in your message.',
  },
  {
    question: 'How can I report a technical issue?',
    answer: 'Select "Technical Support" as your subject and provide as many details as possible about the issue.',
  },
];

const defaultSubjects = [
  'General Inquiry',
  'Sales Question',
  'Technical Support',
  'Partnership Opportunity',
  'Other',
];

async function fetchContactData(): Promise<ContactPageData> {
  const response = await fetch('/api/public/contact');
  if (!response.ok) {
    throw new Error('Failed to fetch contact data');
  }
  return response.json();
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch contact data from API
  const { data: contactData } = useQuery({
    queryKey: ['public', 'contact'],
    queryFn: fetchContactData,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Get enabled blocks sorted by order
  const enabledBlocks = (contactData?.contentBlocks || [])
    .filter((block) => block.enabled)
    .sort((a, b) => a.order - b.order);

  // Build contact info from contactFields (if available) or fall back to legacy fields
  const contactInfo = (() => {
    // Use contactFields if available (from admin management)
    if (contactData?.contactFields && contactData.contactFields.length > 0) {
      return contactData.contactFields
        .filter((field) => field.enabled && field.value) // Only show enabled fields with values
        .sort((a, b) => a.order - b.order)
        .map((field) => {
          const Icon = fieldTypeIcons[field.type] || Building;
          let link: string | null = null;

          // Generate links based on field type
          if (field.type === 'email' && field.value) {
            link = `mailto:${field.value}`;
          } else if (field.type === 'phone' && field.value) {
            link = `tel:${field.value.replace(/[^+\d]/g, '')}`;
          } else if (field.type === 'website' && field.value) {
            link = field.value.startsWith('http') ? field.value : `https://${field.value}`;
          }

          return {
            icon: Icon,
            title: field.label,
            value: field.value,
            link,
          };
        });
    }

    // Fall back to legacy fields
    const legacyFields = [];
    if (contactData?.email || defaultContactInfo.email) {
      const email = contactData?.email || defaultContactInfo.email;
      legacyFields.push({
        icon: Mail,
        title: 'Email',
        value: email,
        link: `mailto:${email}`,
      });
    }
    if (contactData?.phone || defaultContactInfo.phone) {
      const phone = contactData?.phone || defaultContactInfo.phone;
      legacyFields.push({
        icon: Phone,
        title: 'Phone',
        value: phone,
        link: `tel:${phone.replace(/[^+\d]/g, '')}`,
      });
    }
    if (contactData?.address || defaultContactInfo.address) {
      legacyFields.push({
        icon: MapPin,
        title: 'Office',
        value: contactData?.address || defaultContactInfo.address,
        link: null,
      });
    }
    if (contactData?.businessHours || defaultContactInfo.businessHours) {
      legacyFields.push({
        icon: Clock,
        title: 'Business Hours',
        value: contactData?.businessHours || defaultContactInfo.businessHours,
        link: null,
      });
    }
    return legacyFields;
  })();

  // Use fetched FAQs or fallback to defaults
  const faqs = contactData?.faqs?.length ? contactData.faqs : defaultFaqs;

  // Use fetched subjects or fallback to defaults
  const subjects = contactData?.formSettings?.subjects?.length
    ? contactData.formSettings.subjects
    : defaultSubjects;

  // Success message
  const successMessage =
    contactData?.formSettings?.successMessage ||
    "Thank you for contacting us. We'll get back to you within 24 hours.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitted(true);
    setLoading(false);

    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Render individual block components
  const renderBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'hero':
        return (
          <section key={block.id} className="py-20 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <MessageSquare className="w-4 h-4" />
                <span>{(block.content.badge as string) || 'Get in Touch'}</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                {((block.content.headline as string) || 'Contact Us').split(' ').slice(0, -1).join(' ')}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {' '}
                  {((block.content.headline as string) || 'Contact Us').split(' ').slice(-1)[0]}
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                {(block.content.subtitle as string) ||
                  "Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible."}
              </p>
            </div>
          </section>
        );

      case 'contact-info':
        if (contactInfo.length === 0) return null;
        // Dynamic grid columns based on number of items
        const gridCols =
          contactInfo.length === 1
            ? 'lg:grid-cols-1 max-w-md mx-auto'
            : contactInfo.length === 2
            ? 'lg:grid-cols-2 max-w-2xl mx-auto'
            : contactInfo.length === 3
            ? 'lg:grid-cols-3 max-w-4xl mx-auto'
            : 'lg:grid-cols-4';
        return (
          <section key={block.id} className="py-12 -mt-10 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-6`}>
                {contactInfo.map((info, index) => {
                  const Icon = info.icon;
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
                    >
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                        {info.title}
                      </h3>
                      {info.link ? (
                        <a
                          href={info.link}
                          className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors break-all"
                        >
                          {info.value}
                        </a>
                      ) : (
                        <p className="text-lg font-medium text-gray-900">{info.value}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );

      case 'contact-form':
        return (
          <section key={block.id} className="py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600">{successMessage}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        {(block.content.heading as string) || 'Send us a Message'}
                      </h2>
                      <p className="text-gray-600">
                        {(block.content.subheading as string) ||
                          "Fill out the form below and we'll get back to you shortly."}
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="name">Your Name *</Label>
                          <Input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="mt-2"
                            placeholder="John Doe"
                          />
                        </div>

                        <div>
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="mt-2"
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <select
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900"
                        >
                          <option value="">Select a subject</option>
                          {subjects.map((subject) => (
                            <option
                              key={subject}
                              value={subject.toLowerCase().replace(/\s+/g, '-')}
                            >
                              {subject}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="message">Message *</Label>
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          required
                          rows={6}
                          className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-white text-gray-900"
                          placeholder="Tell us more about your inquiry..."
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-6 text-lg"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </section>
        );

      case 'faqs':
        if (faqs.length === 0) return null;
        return (
          <section key={block.id} className="py-20 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {(block.content.heading as string) || 'Frequently Asked Questions'}
                </h2>
                <p className="text-gray-600">
                  {(block.content.subheading as string) || 'Find quick answers to common questions'}
                </p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'custom-text':
        const heading = block.content.heading as string | undefined;
        const text = block.content.text as string | undefined;
        if (!text && !heading) return null;
        return (
          <section key={block.id} className="py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {heading && (
                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                  {heading}
                </h2>
              )}
              {text && (
                <div className="prose prose-lg max-w-none text-gray-600">
                  <p className="whitespace-pre-line">{text}</p>
                </div>
              )}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <Navbar />

      {/* Render blocks in order */}
      {enabledBlocks.length > 0 ? (
        enabledBlocks.map((block) => renderBlock(block))
      ) : (
        // Fallback to default layout if no blocks configured
        <>
          {/* Hero Section */}
          <section className="py-20 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <MessageSquare className="w-4 h-4" />
                <span>Get in Touch</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Contact
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {' '}
                  Us
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                Have questions? We&apos;d love to hear from you. Send us a message and
                we&apos;ll respond as soon as possible.
              </p>
            </div>
          </section>

          {/* Contact Info Cards */}
          {contactInfo.length > 0 && (
            <section className="py-12 -mt-10 relative z-10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 ${
                    contactInfo.length === 1
                      ? 'lg:grid-cols-1 max-w-md mx-auto'
                      : contactInfo.length === 2
                      ? 'lg:grid-cols-2 max-w-2xl mx-auto'
                      : contactInfo.length === 3
                      ? 'lg:grid-cols-3 max-w-4xl mx-auto'
                      : 'lg:grid-cols-4'
                  } gap-6`}
                >
                  {contactInfo.map((info, index) => {
                    const Icon = info.icon;
                    return (
                      <div
                        key={index}
                        className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
                      >
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                          {info.title}
                        </h3>
                        {info.link ? (
                          <a
                            href={info.link}
                            className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors break-all"
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p className="text-lg font-medium text-gray-900">{info.value}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Contact Form */}
          <section className="py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600">{successMessage}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">Send us a Message</h2>
                      <p className="text-gray-600">
                        Fill out the form below and we&apos;ll get back to you shortly.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="name">Your Name *</Label>
                          <Input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="mt-2"
                            placeholder="John Doe"
                          />
                        </div>

                        <div>
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="mt-2"
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <select
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900"
                        >
                          <option value="">Select a subject</option>
                          {subjects.map((subject) => (
                            <option
                              key={subject}
                              value={subject.toLowerCase().replace(/\s+/g, '-')}
                            >
                              {subject}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="message">Message *</Label>
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          required
                          rows={6}
                          className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-white text-gray-900"
                          placeholder="Tell us more about your inquiry..."
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-6 text-lg"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          {faqs.length > 0 && (
            <section className="py-20 bg-gray-50">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Frequently Asked Questions
                  </h2>
                  <p className="text-gray-600">Find quick answers to common questions</p>
                </div>

                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
