import React, { useState } from 'react';
import { useCookieConsent } from './useCookieConsent';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

export interface CookiePreferencesModalProps {
  tenantId: string;
}

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

const COOKIE_CATEGORIES: CookieCategory[] = [
  {
    id: 'necessary',
    name: 'Necessary Cookies',
    description:
      'These cookies are essential for the website to function properly. They enable core functionality such as security, network management, and accessibility. You cannot opt-out of these cookies.',
    required: true,
  },
  {
    id: 'analytics',
    name: 'Analytics Cookies',
    description:
      'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website and provide better user experiences.',
    required: false,
  },
  {
    id: 'marketing',
    name: 'Marketing Cookies',
    description:
      'These cookies are used to track visitors across websites. The intention is to display ads that are relevant and engaging for the individual user and thereby more valuable for publishers and third-party advertisers.',
    required: false,
  },
];

/**
 * Cookie preferences modal component
 * Allows users to customize their cookie preferences in detail
 */
export function CookiePreferencesModal({ tenantId }: CookiePreferencesModalProps) {
  const {
    consent,
    showPreferences,
    closePreferences,
    updatePreferences,
  } = useCookieConsent(tenantId);

  // Local state for preferences (initialized from current consent or defaults)
  const [analyticsCookies, setAnalyticsCookies] = useState(
    consent?.analyticsCookies ?? false
  );
  const [marketingCookies, setMarketingCookies] = useState(
    consent?.marketingCookies ?? false
  );

  // Handle save preferences
  const handleSave = () => {
    updatePreferences(analyticsCookies, marketingCookies);
  };

  // Handle cancel
  const handleCancel = () => {
    // Reset to current consent values
    setAnalyticsCookies(consent?.analyticsCookies ?? false);
    setMarketingCookies(consent?.marketingCookies ?? false);
    closePreferences();
  };

  return (
    <Dialog open={showPreferences} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
          <DialogDescription>
            Manage your cookie preferences. You can enable or disable different types of cookies
            below. Note that disabling some types of cookies may impact your experience on our
            website.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {COOKIE_CATEGORIES.map((category) => {
            const isChecked =
              category.id === 'necessary'
                ? true
                : category.id === 'analytics'
                ? analyticsCookies
                : marketingCookies;

            const handleToggle = (checked: boolean) => {
              if (category.id === 'analytics') {
                setAnalyticsCookies(checked);
              } else if (category.id === 'marketing') {
                setMarketingCookies(checked);
              }
            };

            return (
              <div
                key={category.id}
                className="flex items-start space-x-4 rounded-lg border p-4"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{category.name}</h4>
                    <div className="flex items-center space-x-2">
                      {category.required ? (
                        <span className="text-xs text-muted-foreground">Always On</span>
                      ) : (
                        <Switch
                          id={category.id}
                          checked={isChecked}
                          onCheckedChange={handleToggle}
                          disabled={category.required}
                          aria-label={`Toggle ${category.name}`}
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            Save Preferences
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
