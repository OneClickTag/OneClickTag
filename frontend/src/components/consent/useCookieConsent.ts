import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface ConsentChoice {
  tenantId: string;
  anonymousId: string;
  necessaryCookies: boolean;
  analyticsCookies: boolean;
  marketingCookies: boolean;
  newsletterConsent: boolean;
  consentGivenAt: Date;
}

export interface BannerConfig {
  headingText: string;
  bodyText: string;
  acceptButtonText: string; // Maps to acceptAllButtonText from DB
  rejectButtonText: string; // Maps to rejectAllButtonText from DB
  customizeButtonText: string;
  primaryColor: string; // Maps to acceptButtonColor from DB
  secondaryColor: string; // Maps to backgroundColor from DB
  textColor: string;
  position: 'bottom' | 'top' | 'center';
  consentExpiryDays: number;
}

// Database response interface (matches backend schema)
interface BannerConfigFromDB {
  headingText: string;
  bodyText: string;
  acceptAllButtonText: string;
  rejectAllButtonText: string;
  customizeButtonText: string;
  backgroundColor: string;
  textColor: string;
  acceptButtonColor: string;
  position: string;
  consentExpiryDays: number;
}

const CONSENT_STORAGE_KEY = 'oneclicktag_consent';
const ANONYMOUS_ID_KEY = 'oneclicktag_anonymous_id';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get or create an anonymous ID for tracking consent
 */
function getOrCreateAnonymousId(): string {
  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);

  if (!anonymousId) {
    anonymousId = uuidv4();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  }

  return anonymousId;
}

/**
 * Get the storage key for a specific tenant
 */
function getConsentStorageKey(tenantId: string): string {
  return `${CONSENT_STORAGE_KEY}_${tenantId}`;
}

/**
 * Check if consent has expired based on the expiry days
 */
function isConsentExpired(consentGivenAt: Date, expiryDays: number): boolean {
  const expiryDate = new Date(consentGivenAt);
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  return new Date() > expiryDate;
}

/**
 * Load existing consent from localStorage
 */
function loadConsentFromStorage(tenantId: string, expiryDays: number): ConsentChoice | null {
  try {
    const stored = localStorage.getItem(getConsentStorageKey(tenantId));

    if (!stored) {
      return null;
    }

    const consent: ConsentChoice = JSON.parse(stored);

    // Check if consent has expired
    if (isConsentExpired(new Date(consent.consentGivenAt), expiryDays)) {
      localStorage.removeItem(getConsentStorageKey(tenantId));
      return null;
    }

    return consent;
  } catch (error) {
    console.error('Error loading consent from storage:', error);
    return null;
  }
}

/**
 * Save consent to localStorage
 */
function saveConsentToStorage(tenantId: string, consent: ConsentChoice): void {
  try {
    localStorage.setItem(getConsentStorageKey(tenantId), JSON.stringify(consent));
  } catch (error) {
    console.error('Error saving consent to storage:', error);
  }
}

/**
 * Record consent to backend API
 */
async function recordConsentToBackend(consent: ConsentChoice): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/public/consent/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(consent),
    });
  } catch (error) {
    console.error('Error recording consent to backend:', error);
    // Don't throw - we still want to save locally even if backend fails
  }
}

/**
 * Load banner configuration from backend
 */
async function loadBannerConfig(tenantId: string): Promise<BannerConfig | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/consent/banner?tenantId=${tenantId}`);

    if (!response.ok) {
      throw new Error('Failed to load banner config');
    }

    const dbConfig: BannerConfigFromDB = await response.json();

    // Map database fields to component-friendly field names
    return {
      headingText: dbConfig.headingText,
      bodyText: dbConfig.bodyText,
      acceptButtonText: dbConfig.acceptAllButtonText,
      rejectButtonText: dbConfig.rejectAllButtonText,
      customizeButtonText: dbConfig.customizeButtonText,
      primaryColor: dbConfig.acceptButtonColor,
      secondaryColor: dbConfig.backgroundColor,
      textColor: dbConfig.textColor,
      position: dbConfig.position as 'bottom' | 'top' | 'center',
      consentExpiryDays: dbConfig.consentExpiryDays,
    };
  } catch (error) {
    console.error('Error loading banner config:', error);
    return null;
  }
}

/**
 * Hook for managing cookie consent
 */
export function useCookieConsent(tenantId: string) {
  const [consent, setConsent] = useState<ConsentChoice | null>(null);
  const [bannerConfig, setBannerConfig] = useState<BannerConfig | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load banner config and existing consent on mount
  useEffect(() => {
    async function initialize() {
      setIsLoading(true);

      // Load banner config first
      const config = await loadBannerConfig(tenantId);
      setBannerConfig(config);

      if (!config) {
        setIsLoading(false);
        return;
      }

      // Check for existing consent
      const existingConsent = loadConsentFromStorage(tenantId, config.consentExpiryDays);

      if (existingConsent) {
        setConsent(existingConsent);
        setShowBanner(false);
      } else {
        // No valid consent found - show banner
        setShowBanner(true);
      }

      setIsLoading(false);
    }

    initialize();
  }, [tenantId]);

  /**
   * Accept all cookies
   */
  const acceptAll = useCallback(() => {
    const choice: ConsentChoice = {
      tenantId,
      anonymousId: getOrCreateAnonymousId(),
      necessaryCookies: true,
      analyticsCookies: true,
      marketingCookies: true,
      newsletterConsent: false,
      consentGivenAt: new Date(),
    };

    setConsent(choice);
    saveConsentToStorage(tenantId, choice);
    recordConsentToBackend(choice);
    setShowBanner(false);
    setShowPreferences(false);
  }, [tenantId]);

  /**
   * Reject all non-necessary cookies
   */
  const rejectAll = useCallback(() => {
    const choice: ConsentChoice = {
      tenantId,
      anonymousId: getOrCreateAnonymousId(),
      necessaryCookies: true,
      analyticsCookies: false,
      marketingCookies: false,
      newsletterConsent: false,
      consentGivenAt: new Date(),
    };

    setConsent(choice);
    saveConsentToStorage(tenantId, choice);
    recordConsentToBackend(choice);
    setShowBanner(false);
    setShowPreferences(false);
  }, [tenantId]);

  /**
   * Update preferences with custom choices
   */
  const updatePreferences = useCallback((analyticsCookies: boolean, marketingCookies: boolean, newsletterConsent = false) => {
    const choice: ConsentChoice = {
      tenantId,
      anonymousId: getOrCreateAnonymousId(),
      necessaryCookies: true,
      analyticsCookies,
      marketingCookies,
      newsletterConsent,
      consentGivenAt: new Date(),
    };

    setConsent(choice);
    saveConsentToStorage(tenantId, choice);
    recordConsentToBackend(choice);
    setShowBanner(false);
    setShowPreferences(false);
  }, [tenantId]);

  /**
   * Open preferences modal
   */
  const openPreferences = useCallback(() => {
    setShowPreferences(true);
  }, []);

  /**
   * Close preferences modal
   */
  const closePreferences = useCallback(() => {
    setShowPreferences(false);
  }, []);

  /**
   * Reset consent (for testing or user-initiated reset)
   */
  const resetConsent = useCallback(() => {
    localStorage.removeItem(getConsentStorageKey(tenantId));
    setConsent(null);
    setShowBanner(true);
  }, [tenantId]);

  return {
    consent,
    showBanner,
    showPreferences,
    bannerConfig,
    isLoading,
    acceptAll,
    rejectAll,
    updatePreferences,
    openPreferences,
    closePreferences,
    resetConsent,
  };
}
