import { AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ConnectionRequiredBannerProps {
  customerSlug?: string;
  missingServices: {
    gtm: boolean;
    ga4: boolean;
    ads: boolean;
  };
}

export function ConnectionRequiredBanner({
  customerSlug,
  missingServices,
}: ConnectionRequiredBannerProps) {
  const navigate = useNavigate();

  const handleGoToSettings = () => {
    if (customerSlug) {
      navigate(`/customers/${customerSlug}`, { state: { activeTab: 'settings' } });
    }
  };

  const allDisconnected = missingServices.gtm && missingServices.ga4 && missingServices.ads;
  const someDisconnected = Object.values(missingServices).some(v => v);

  if (!someDisconnected) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
      <div className="flex items-start space-x-4">
        <AlertCircle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            {allDisconnected
              ? 'Google Services Not Connected'
              : 'Some Google Services Not Connected'}
          </h3>

          {allDisconnected ? (
            <div className="space-y-3">
              <p className="text-sm text-yellow-800">
                You need to connect your Google account before creating tracking. This allows OneClickTag to:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1 ml-4 list-disc">
                <li>Create tags and triggers in Google Tag Manager</li>
                <li>Set up event tracking in Google Analytics 4</li>
                <li>Create conversion actions in Google Ads</li>
              </ul>
              <p className="text-sm text-yellow-800 font-medium mt-3">
                Go to Settings to connect your Google account.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-yellow-800">
                Some tracking destinations are unavailable because the following services are not connected:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1 ml-4 list-disc">
                {missingServices.gtm && (
                  <li>
                    <span className="font-medium">Google Tag Manager</span> - Required for all tracking
                  </li>
                )}
                {missingServices.ga4 && (
                  <li>
                    <span className="font-medium">Google Analytics 4</span> - Required for GA4 event tracking
                  </li>
                )}
                {missingServices.ads && (
                  <li>
                    <span className="font-medium">Google Ads</span> - Required for conversion tracking
                  </li>
                )}
              </ul>
              <p className="text-sm text-yellow-800 font-medium mt-3">
                Connect these services in Settings to unlock all tracking options.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 ml-10">
        <Button onClick={handleGoToSettings} variant="default">
          <Settings className="w-4 h-4 mr-2" />
          Go to Settings
        </Button>
      </div>
    </div>
  );
}
