export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface Customer {
  id: string;
  slug: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  company?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  status: CustomerStatus;
  tags: string[];
  notes?: string | null;
  customFields?: Record<string, unknown> | null;
  trackingSettings?: {
    defaultDestinations?: string[];
    defaultGA4Property?: string;
    defaultAdsAccount?: string;
  } | null;
  googleAccountId?: string | null;
  googleEmail?: string | null;
  gtmAccountId?: string | null;
  gtmContainerId?: string | null;
  gtmWorkspaceId?: string | null;
  gtmContainerName?: string | null;
  selectedAdsAccountId?: string | null;
  serverSideEnabled?: boolean;
  stapeContainer?: StapeContainer | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  // Relations
  googleAdsAccounts?: GoogleAdsAccount[];
  ga4Properties?: GA4Property[];
  trackings?: Tracking[];
}

export interface GoogleAdsAccount {
  id: string;
  googleAccountId: string;
  accountId: string;
  accountName: string;
  currency: string;
  timeZone: string;
  isActive: boolean;
  customerId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GA4Property {
  id: string;
  googleAccountId: string;
  propertyId: string;
  propertyName: string;
  displayName?: string | null;
  websiteUrl?: string | null;
  timeZone?: string | null;
  currency?: string | null;
  industryCategory?: string | null;
  isActive: boolean;
  measurementId?: string | null;
  customerId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StapeDnsRecord {
  type: { type: string; label: string };
  host: string;
  value: string;
  domain?: string;
}

export interface StapeContainer {
  id: string;
  customerId: string;
  stapeContainerId: string;
  containerName: string;
  serverDomain: string;
  stapeDefaultDomain: string;
  dnsRecords?: StapeDnsRecord[] | null;
  status: 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'FAILED';
  domainStatus: 'PENDING' | 'VALIDATED' | 'FAILED';
  gtmServerContainerId?: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateCustomerInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  status?: CustomerStatus;
  tags?: string[];
  notes?: string | null;
  trackingSettings?: Record<string, unknown> | null;
  selectedAdsAccountId?: string | null;
}

// Import Tracking type for relation
import type { Tracking } from './tracking';
