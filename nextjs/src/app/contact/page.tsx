import { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getContactPageData, buildPageMetadata } from '@/lib/server/api';
import { ContactContent } from './ContactContent';

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic';

// Default values
const defaultContactInfo = {
  email: 'hello@oneclicktag.com',
  phone: '+1 (555) 123-4567',
  address: 'San Francisco, CA',
  businessHours: 'Mon-Fri: 9AM-6PM PST',
};

const defaultFaqs = [
  {
    question: 'What is your response time?',
    answer:
      'We typically respond to all inquiries within 24 hours during business days.',
  },
  {
    question: 'Do you offer phone support?',
    answer:
      'Yes! Phone support is available for all paid plans. Contact us to schedule a call.',
  },
  {
    question: 'Can I schedule a demo?',
    answer:
      'Absolutely! Choose "Sales Question" as your subject and mention demo in your message.',
  },
  {
    question: 'How can I report a technical issue?',
    answer:
      'Select "Technical Support" as your subject and provide as many details as possible about the issue.',
  },
];

const defaultSubjects = [
  'General Inquiry',
  'Sales Question',
  'Technical Support',
  'Partnership Opportunity',
  'Other',
];

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildPageMetadata(
    '/contact',
    'Contact Us | OneClickTag',
    'Get in touch with our team. We are here to help with any questions about OneClickTag.'
  );

  return {
    title: metadata.title,
    description: metadata.description,
    robots: metadata.robots,
    alternates: metadata.canonical ? { canonical: metadata.canonical } : undefined,
    openGraph: metadata.openGraph,
    twitter: metadata.twitter,
  };
}

export default async function ContactPage() {
  // Fetch contact page data server-side
  const contactData = await getContactPageData();

  // Build contact info for the page
  const contactInfo = buildContactInfo(contactData);
  const faqs =
    contactData?.faqs && contactData.faqs.length > 0
      ? contactData.faqs
      : defaultFaqs;
  const subjects =
    contactData?.formSettings?.subjects && contactData.formSettings.subjects.length > 0
      ? contactData.formSettings.subjects
      : defaultSubjects;
  const successMessage =
    contactData?.formSettings?.successMessage ||
    "Thank you for contacting us. We'll get back to you within 24 hours.";
  const contentBlocks = contactData?.contentBlocks || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <Navbar />

      {/* Contact Content (Client Component for form interactivity) */}
      <ContactContent
        contactInfo={contactInfo}
        faqs={faqs}
        subjects={subjects}
        successMessage={successMessage}
        contentBlocks={contentBlocks}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Helper function to build contact info
function buildContactInfo(
  contactData: Awaited<ReturnType<typeof getContactPageData>>
) {
  // Use contactFields if available (from admin management)
  if (
    contactData?.contactFields &&
    contactData.contactFields.length > 0
  ) {
    return contactData.contactFields
      .filter((field) => field.enabled && field.value)
      .sort((a, b) => a.order - b.order)
      .map((field) => {
        let link: string | null = null;

        if (field.type === 'email' && field.value) {
          link = `mailto:${field.value}`;
        } else if (field.type === 'phone' && field.value) {
          link = `tel:${field.value.replace(/[^+\d]/g, '')}`;
        } else if (field.type === 'website' && field.value) {
          link = field.value.startsWith('http')
            ? field.value
            : `https://${field.value}`;
        }

        return {
          type: field.type,
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
      type: 'email' as const,
      title: 'Email',
      value: email,
      link: `mailto:${email}`,
    });
  }
  if (contactData?.phone || defaultContactInfo.phone) {
    const phone = contactData?.phone || defaultContactInfo.phone;
    legacyFields.push({
      type: 'phone' as const,
      title: 'Phone',
      value: phone,
      link: `tel:${phone.replace(/[^+\d]/g, '')}`,
    });
  }
  if (contactData?.address || defaultContactInfo.address) {
    legacyFields.push({
      type: 'address' as const,
      title: 'Office',
      value: contactData?.address || defaultContactInfo.address,
      link: null,
    });
  }
  if (contactData?.businessHours || defaultContactInfo.businessHours) {
    legacyFields.push({
      type: 'hours' as const,
      title: 'Business Hours',
      value: contactData?.businessHours || defaultContactInfo.businessHours,
      link: null,
    });
  }
  return legacyFields;
}
