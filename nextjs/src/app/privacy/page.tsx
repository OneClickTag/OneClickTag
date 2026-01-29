'use client';

import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  const lastUpdated = 'January 1, 2025';

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
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {lastUpdated}
                </p>
              </div>
            </div>
            <p className="text-gray-600 text-lg">
              Your privacy is important to us. This Privacy Policy explains how
              OneClickTag collects, uses, and protects your personal information.
            </p>
          </div>

          {/* Privacy Content */}
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                1. Information We Collect
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 ml-4">
                <li>Account information (name, email address, password)</li>
                <li>Profile information (company name, website URL)</li>
                <li>
                  Payment information (processed securely through third-party
                  payment processors)
                </li>
                <li>Communication data (support requests, feedback)</li>
                <li>Usage data (how you interact with our Service)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                2. How We Use Your Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 ml-4">
                <li>Provide, maintain, and improve our Service</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>
                  Detect, prevent, and address technical issues and security
                  threats
                </li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                3. Information Sharing
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share information about you in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 ml-4">
                <li>
                  <strong>Service Providers:</strong> We work with third-party
                  service providers who perform services on our behalf, such as
                  payment processing, data analysis, email delivery, and hosting
                  services.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> We may disclose your
                  information if required to do so by law or in response to valid
                  requests by public authorities.
                </li>
                <li>
                  <strong>Business Transfers:</strong> In the event of a merger,
                  acquisition, or sale of assets, your information may be
                  transferred.
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                4. Google API Data Usage
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                OneClickTag&apos;s use and transfer of information received from
                Google APIs adheres to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We access Google Tag Manager and Google Ads data solely to:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 ml-4">
                <li>
                  Create and manage conversion tracking tags on your behalf
                </li>
                <li>Sync tracking configurations with your Google accounts</li>
                <li>
                  Provide analytics and reporting on your tracking performance
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not use this data for any other purpose and do not share it
                with third parties except as necessary to provide the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                5. Data Security
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to
                protect your personal information against unauthorized or unlawful
                processing, accidental loss, destruction, or damage. These measures
                include:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                6. Data Retention
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We retain your personal information for as long as necessary to
                provide the Service and fulfill the purposes outlined in this
                Privacy Policy, unless a longer retention period is required or
                permitted by law.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you delete your account, we will delete or anonymize your
                personal information within 30 days, except where we are required
                to retain it for legal or compliance purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                7. Your Rights
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding
                your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 ml-4">
                <li>Access and receive a copy of your personal information</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Delete your personal information</li>
                <li>Object to or restrict certain processing activities</li>
                <li>Data portability</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                To exercise these rights, please contact us using the information
                below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                8. Cookies and Tracking
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to collect and
                track information about your use of the Service. You can instruct
                your browser to refuse all cookies or to indicate when a cookie is
                being sent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                9. Children&apos;s Privacy
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service is not intended for children under the age of 13. We do
                not knowingly collect personal information from children under 13.
                If you are a parent or guardian and believe your child has provided
                us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                10. Changes to This Policy
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will notify
                you of any changes by posting the new Privacy Policy on this page
                and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                11. Contact Us
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy, please contact
                us:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 font-medium">
                  OneClickTag Privacy Team
                </p>
                <p className="text-gray-600">Email: privacy@oneclicktag.com</p>
                <p className="text-gray-600">Address: San Francisco, CA</p>
              </div>
            </section>
          </div>
        </div>
      </article>

      {/* Footer */}
      <Footer />
    </div>
  );
}
