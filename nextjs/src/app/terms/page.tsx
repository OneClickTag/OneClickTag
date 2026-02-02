'use client';

import { useState, useEffect } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { FileText } from 'lucide-react';

interface TermsSection {
  title: string;
  content: string;
  list?: string[];
  contact?: {
    name: string;
    email: string;
    address: string;
  };
}

interface TermsContent {
  lastUpdated: string;
  sections: TermsSection[];
}

// Default content (fallback)
const defaultContent: TermsContent = {
  lastUpdated: 'January 1, 2025',
  sections: [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing and using OneClickTag ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.',
    },
    {
      title: '2. Use License',
      content: 'Permission is granted to temporarily use OneClickTag for personal or commercial purposes. This is the grant of a license, not a transfer of title, and under this license you may not:',
      list: [
        'Modify or copy the materials',
        'Use the materials for any commercial purpose without proper licensing',
        'Attempt to decompile or reverse engineer any software contained on the platform',
        'Remove any copyright or other proprietary notations from the materials',
        'Transfer the materials to another person or "mirror" the materials on any other server',
      ],
    },
    {
      title: '3. User Accounts',
      content: 'When you create an account with us, you must provide accurate, complete, and current information at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.',
    },
    {
      title: '4. Billing and Payments',
      content: 'Paid subscriptions may be offered with different features and pricing. You will be billed in advance on a recurring and periodic basis. Billing cycles are set on a monthly or annual basis, depending on the type of subscription plan you select. A valid payment method, including credit card, is required to process the payment for your subscription. You shall provide accurate and complete billing information.',
    },
    {
      title: '5. Cancellation and Refunds',
      content: 'You may cancel your subscription at any time through your account settings. Your cancellation will take effect at the end of the current paid term. Refunds are provided on a case-by-case basis. Please contact our support team if you believe you are entitled to a refund.',
    },
    {
      title: '6. Intellectual Property',
      content: 'The Service and its original content, features, and functionality are and will remain the exclusive property of OneClickTag and its licensors. The Service is protected by copyright, trademark, and other laws.',
    },
    {
      title: '7. Limitation of Liability',
      content: 'In no event shall OneClickTag, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.',
    },
    {
      title: '8. Changes to Terms',
      content: 'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.',
    },
    {
      title: '9. Contact Information',
      content: 'If you have any questions about these Terms, please contact us at:',
      contact: {
        name: 'OneClickTag Support',
        email: 'legal@oneclicktag.com',
        address: 'San Francisco, CA',
      },
    },
  ],
};

export default function TermsPage() {
  const [content, setContent] = useState<TermsContent>(defaultContent);

  useEffect(() => {
    // Fetch content from API
    fetch('/api/pages/terms')
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          setContent({
            lastUpdated: data.content.lastUpdated || defaultContent.lastUpdated,
            sections: data.content.sections || defaultContent.sections,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch terms page content:', err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navbar />

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
          {/* Header */}
          <div className="border-b border-gray-200 pb-8 mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  Terms of Service
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {content.lastUpdated}
                </p>
              </div>
            </div>
          </div>

          {/* Terms Content */}
          <div className="prose prose-lg max-w-none">
            {content.sections.map((section, index) => (
              <section key={index} className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {section.title}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {section.content}
                </p>
                {section.list && (
                  <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 ml-4">
                    {section.list.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.contact && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-700 font-medium">{section.contact.name}</p>
                    <p className="text-gray-600">Email: {section.contact.email}</p>
                    <p className="text-gray-600">Address: {section.contact.address}</p>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </article>

      {/* Footer */}
      <Footer />
    </div>
  );
}
