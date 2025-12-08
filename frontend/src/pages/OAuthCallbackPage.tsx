import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '@/lib/api/services';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        setStatus('validating');
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        const state = urlParams.get('state'); // This contains the customer ID
        const scope = urlParams.get('scope'); // Check what scopes were granted
        const error = urlParams.get('error');

        console.log('OAuth callback params:', { authCode: !!authCode, state, scope, error });

        if (error) {
          console.error('OAuth error from Google:', error);
          setStatus('error');
          setTimeout(() => navigate('/customers?error=oauth_denied'), 2000);
          return;
        }

        if (!authCode) {
          console.error('No authorization code received');
          setStatus('error');
          setTimeout(() => navigate('/customers?error=no_auth_code'), 2000);
          return;
        }

        if (!state) {
          console.error('No customer ID in state parameter');
          setStatus('error');
          setTimeout(() => navigate('/customers?error=no_customer_id'), 2000);
          return;
        }

        // Check if we got the required scopes
        const hasAdsScope = scope?.includes('adwords') || scope?.includes('googleads');
        const hasGTMScope = scope?.includes('tagmanager');
        
        console.log('Granted scopes check:', { hasAdsScope, hasGTMScope, fullScope: scope });

        if (!hasAdsScope && !hasGTMScope) {
          console.warn('Neither Ads nor GTM scope was granted');
        }

        setStatus('connecting');
        console.log('Connecting Google account for customer:', state);

        // Connect the Google account with proper error handling
        try {
          const connectionResult = await customersApi.handleGoogleCallback(state, authCode);
          console.log('Google account connected successfully:', connectionResult);

          setStatus('redirecting');

          // Get customer data to build proper URL with slug
          if (state) {
            try {
              const customer = await customersApi.getCustomer(state);
              console.log('Redirecting to customer detail page with slug:', customer.slug);
              navigate(`/customer/${customer.slug}?connected=true&scopes=${encodeURIComponent(scope || '')}`);
            } catch (err) {
              console.error('Failed to get customer data, redirecting to customers list');
              navigate('/customers?connected=true');
            }
          } else {
            console.log('No customer ID in state, redirecting to customers list');
            navigate('/customers?connected=true');
          }
          
        } catch (connectionError: any) {
          console.error('Failed to connect Google account:', connectionError);
          console.error('Connection error details:', {
            message: connectionError.message,
            response: connectionError.response?.data,
            status: connectionError.response?.status,
          });
          
          setStatus('error');
          const errorMessage = connectionError.response?.data?.message || connectionError.message || 'Connection failed';
          setTimeout(() => navigate(`/customers?error=connection_failed&details=${encodeURIComponent(errorMessage)}`), 2000);
        }

      } catch (error: any) {
        console.error('OAuth callback processing error:', error);
        setStatus('error');
        setTimeout(() => navigate('/customers?error=callback_failed'), 2000);
      }
    };

    // Only run the callback handler once
    if (status === 'processing') {
      handleOAuthCallback();
    }
  }, [navigate, status]);

  const renderContent = () => {
    switch (status) {
      case 'processing':
      case 'validating':
        return (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Validating Google authorization...</p>
            <p className="text-sm text-muted-foreground mt-2">Checking permissions and authorization code</p>
          </>
        );
      case 'connecting':
        return (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p>Connecting your Google account...</p>
            <p className="text-sm text-muted-foreground mt-2">Setting up Google Ads and Tag Manager access</p>
          </>
        );
      case 'redirecting':
        return (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Connection successful!</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting you back to the customer page...</p>
          </>
        );
      case 'error':
        return (
          <>
            <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p>Connection failed</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting you back...</p>
          </>
        );
      default:
        return (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Processing...</p>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {renderContent()}
      </div>
    </div>
  );
}