import { ExternalLink, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoogleConnectionInstructionsProps {
  onConnect: () => void;
  isConnecting: boolean;
}

export function GoogleConnectionInstructions({
  onConnect,
  isConnecting,
}: GoogleConnectionInstructionsProps) {
  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <ExternalLink className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Connect Google Services</h2>
        <p className="text-gray-600">
          OneClickTag automates your tracking setup by connecting to Google Tag Manager and Google Analytics
        </p>
      </div>

      {/* Prerequisites */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">
              Before You Connect
            </h3>
            <p className="text-sm text-yellow-700 mb-3">
              Make sure you have the following Google accounts set up:
            </p>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 rounded-full bg-yellow-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-yellow-800 text-xs font-bold">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    Google Tag Manager Account
                  </p>
                  <p className="text-xs text-yellow-600 mb-1">
                    Required to create and manage tracking tags
                  </p>
                  <a
                    href="https://tagmanager.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-yellow-700 hover:text-yellow-900 underline"
                  >
                    Create GTM Account
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 rounded-full bg-yellow-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-yellow-800 text-xs font-bold">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    Google Analytics 4 Account (Optional)
                  </p>
                  <p className="text-xs text-yellow-600 mb-1">
                    For advanced analytics and event tracking
                  </p>
                  <a
                    href="https://analytics.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-yellow-700 hover:text-yellow-900 underline"
                  >
                    Create GA4 Account
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 rounded-full bg-yellow-200 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-yellow-800 text-xs font-bold">3</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    Google Ads Account (Optional)
                  </p>
                  <p className="text-xs text-yellow-600">
                    For conversion tracking and campaign optimization
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">
          What happens when you connect:
        </h3>
        <div className="space-y-2">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                OneClickTag creates a GTM container for you
              </p>
              <p className="text-xs text-gray-600">
                If you don't have one, we'll automatically create a container named "OneClickTag - {'{Your Name}'}"
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Sets up tracking workspace
              </p>
              <p className="text-xs text-gray-600">
                Creates a dedicated "OneClickTag" workspace to keep your tracking organized
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Creates GA4 property (if needed)
              </p>
              <p className="text-xs text-gray-600">
                Automatically creates a GA4 property with web data stream if you don't have one
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Syncs your Google Ads accounts
              </p>
              <p className="text-xs text-gray-600">
                Imports accessible Google Ads accounts for conversion tracking
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Permissions Required
        </h3>
        <p className="text-sm text-blue-700 mb-2">
          When you click "Connect Google Account", you'll be asked to grant the following permissions:
        </p>
        <ul className="text-xs text-blue-600 space-y-1 ml-4 list-disc">
          <li>View and manage your Google Tag Manager containers</li>
          <li>View and manage your Google Analytics properties</li>
          <li>View and manage your Google Ads conversions</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          OneClickTag uses these permissions to automate tracking setup. We never access sensitive data or make unauthorized changes.
        </p>
      </div>

      {/* Connect Button */}
      <div className="text-center pt-4">
        <Button
          onClick={onConnect}
          disabled={isConnecting}
          size="lg"
          className="w-full sm:w-auto"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect Google Account
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          You'll be redirected to Google to authorize access
        </p>
      </div>
    </div>
  );
}
