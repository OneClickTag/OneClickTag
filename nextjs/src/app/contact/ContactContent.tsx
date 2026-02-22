'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type ContactFieldType = 'email' | 'phone' | 'address' | 'hours' | 'website' | 'custom';

interface ContactInfo {
  type: ContactFieldType;
  title: string;
  value: string;
  link: string | null;
}

interface FAQ {
  question: string;
  answer: string;
}

interface ContentBlock {
  id: string;
  type: 'hero' | 'contact-info' | 'contact-form' | 'faqs' | 'custom-text';
  title: string;
  enabled: boolean;
  order: number;
  content: Record<string, unknown>;
}

interface ContactContentProps {
  contactInfo: ContactInfo[];
  faqs: FAQ[];
  subjects: string[];
  successMessage: string;
  contentBlocks: ContentBlock[];
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

export function ContactContent({
  contactInfo,
  faqs,
  subjects,
  successMessage,
  contentBlocks,
}: ContactContentProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get enabled blocks sorted by order
  const enabledBlocks = contentBlocks
    .filter((block) => block.enabled)
    .sort((a, b) => a.order - b.order);

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      setSubmitted(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: '', email: '', subject: '', message: '' });
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
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
                {((block.content.headline as string) || 'Contact Us')
                  .split(' ')
                  .slice(0, -1)
                  .join(' ')}
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
                  const Icon = fieldTypeIcons[info.type] || Building;
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

                      {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                          {error}
                        </div>
                      )}

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
                  {(block.content.subheading as string) ||
                    'Find quick answers to common questions'}
                </p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {faq.question}
                    </h3>
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

  // Render with blocks or fallback to default layout
  if (enabledBlocks.length > 0) {
    return <>{enabledBlocks.map((block) => renderBlock(block))}</>;
  }

  // Fallback to default layout
  return (
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
                const Icon = fieldTypeIcons[info.type] || Building;
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
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Send us a Message
                  </h2>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
