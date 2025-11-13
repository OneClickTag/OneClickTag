import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useFirebaseAuth } from '@/lib/firebase/hooks/useFirebaseAuth';
import { customerService } from '@/lib/api/services/customerService';
import type { Customer } from '@/lib/api/types';

export function CustomerDetailPage() {
  const { isAuthenticated, tokens } = useAuth();
  const { firebaseUser, loading: firebaseLoading } = useFirebaseAuth();
  const navigate = useNavigate();
  const { customerName } = useParams<{ customerName: string }>();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{
    connected: boolean;
    hasAdsAccess: boolean;
    hasGTMAccess: boolean;
    hasGA4Access: boolean;
    googleEmail: string | null;
    connectedAt: string | null;
    gtmError?: string | null;
    ga4Error?: string | null;
    adsError?: string | null;
  } | null>(null);

  const [progressSteps, setProgressSteps] = useState<{
    oauth: 'pending' | 'success' | 'error' | null;
    tokens: 'pending' | 'success' | 'error' | null;
    ads: 'pending' | 'success' | 'error' | null;
    ga4: 'pending' | 'success' | 'error' | null;
    gtm: 'pending' | 'success' | 'error' | null;
    adsError?: string;
    ga4Error?: string;
    gtmError?: string;
  }>({
    oauth: null,
    tokens: null,
    ads: null,
    ga4: null,
    gtm: null,
  });
  
  const [trackingForm, setTrackingForm] = useState({
    type: '',
    selector: '',
    name: '',
    description: '',
  });
  const [isCreatingTracking, setIsCreatingTracking] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const handleConnectGoogle = async () => {
    if (!customer) return;

    setIsConnectingGoogle(true);

    // Reset progress steps
    setProgressSteps({
      oauth: null,
      tokens: null,
      ads: null,
      ga4: null,
      gtm: null,
    });

    try {
      // Get Google auth URL
      const authUrlResponse = await customerService.getGoogleAuthUrl(customer.id);
      const authUrl = authUrlResponse.data.authUrl;

      if (!authUrl) {
        throw new Error('No auth URL received from server');
      }

      // Redirect to Google OAuth (will return to /oauth/callback)
      window.location.href = authUrl;

    } catch (error: any) {
      console.error('Failed to initiate Google connection:', error);
      setError('Failed to start Google connection');
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = () => {
    setShowDisconnectModal(true);
  };

  const confirmDisconnectGoogle = async () => {
    if (!customer || !googleStatus?.connected) return;
    
    setIsConnectingGoogle(true);
    setError(null);
    setShowDisconnectModal(false);
    
    try {
      await customerService.disconnectGoogleAccount(customer.id);
      
      // Update local state
      setGoogleStatus({
        connected: false,
        hasAdsAccess: false,
        hasGTMAccess: false,
        hasGA4Access: false,
        googleEmail: null,
        connectedAt: null,
      });
      
      // Switch to settings tab
      setActiveTab('settings');
      
    } catch (error: any) {
      console.error('Failed to disconnect Google account:', error);
      setError(error.response?.data?.message || 'Failed to disconnect Google account');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleCreateTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !hasFullAccess) return;
    
    setIsCreatingTracking(true);
    setError(null);
    
    try {
      console.log('Creating tracking:', trackingForm, 'for customer:', customer.id);
      
      // Call the tracking creation API
      const response = await customerService.createTracking(customer.id, {
        name: trackingForm.name,
        type: trackingForm.type,
        selector: trackingForm.selector,
        description: trackingForm.description || undefined,
      });
      
      console.log('Tracking created successfully:', response.data);
      
      // Reset form
      setTrackingForm({
        type: '',
        selector: '',
        name: '',
        description: '',
      });
      
      // Show success message
      setError(null);
      
      // Switch to trackings tab to show the new tracking
      setActiveTab('trackings');
      
    } catch (error: any) {
      console.error('Failed to create tracking:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create tracking. Please try again.';
      setError(errorMessage);
    } finally {
      setIsCreatingTracking(false);
    }
  };


  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthCheckComplete(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authCheckComplete && !isAuthenticated && !firebaseUser && !firebaseLoading) {
      const isOnAuthFlow = sessionStorage.getItem('authInProgress') === 'true';
      if (!isOnAuthFlow) {
        window.location.href = '/login';
      }
    }
  }, [authCheckComplete, isAuthenticated, firebaseUser, firebaseLoading]);

  // Fetch customer data when auth is ready
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!authCheckComplete || !isAuthenticated || !customerName) {
        return;
      }

      try {
        setLoading(true);
        // For now, we'll search for the customer by name since we don't have ID
        // In a real app, you'd store customer ID in the URL
        const response = await customerService.getCustomers({
          search: customerName.replace(/-/g, ' '),
          limit: 1,
        });
        
        if (response.data.data && response.data.data.length > 0) {
          const customerData = response.data.data[0];
          setCustomer(customerData);
          
          // Fetch Google connection status
          try {
            const statusResponse = await customerService.getGoogleConnectionStatus(customerData.id);
            console.log('Google connection status received:', statusResponse.data);
            console.log('hasAdsAccess:', statusResponse.data.hasAdsAccess);
            console.log('adsError:', statusResponse.data.adsError);
            setGoogleStatus(statusResponse.data);
          } catch (statusError) {
            console.error('Failed to fetch Google status:', statusError);
            // Don't set error for this, just leave status as null
          }
        } else {
          setError('Customer not found');
        }
      } catch (error: any) {
        console.error('Failed to fetch customer:', error);
        setError('Failed to load customer data');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [authCheckComplete, isAuthenticated, customerName]);

  // Check for connection success message and start SSE
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');

    if (connected === 'true' && customer) {
      // Start showing connection progress
      setIsConnectingGoogle(true);

      // Reset progress
      setProgressSteps({
        oauth: 'success',
        tokens: 'pending',
        ads: null,
        ga4: null,
        gtm: null,
      });

      // Connect to SSE endpoint for real-time progress
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = tokens?.accessToken;
      const eventSource = new EventSource(`${apiUrl}/customers/${customer.id}/google/connection-progress`, {
        withCredentials: true,
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE Progress:', data);

          // Update progress steps
          setProgressSteps(prev => ({
            ...prev,
            [data.step]: data.status,
            ...(data.error && { [`${data.step}Error`]: data.error }),
          }));

          // If complete, refresh customer data
          if (data.step === 'complete') {
            setTimeout(async () => {
              try {
                const response = await customerService.getCustomers({
                  search: customerName?.replace(/-/g, ' '),
                  limit: 1,
                });
                if (response.data.data && response.data.data.length > 0) {
                  const customerData = response.data.data[0];
                  setCustomer(customerData);

                  // Refresh Google connection status
                  const statusResponse = await customerService.getGoogleConnectionStatus(customerData.id);
                  console.log('Google connection status refreshed after OAuth:', statusResponse.data);
                  setGoogleStatus(statusResponse.data);
                }
              } catch (error) {
                console.error('Failed to refresh customer data:', error);
              }

              setIsConnectingGoogle(false);
              eventSource.close();
            }, 1000);
          }
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setIsConnectingGoogle(false);
        eventSource.close();
      };

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Cleanup on unmount
      return () => {
        eventSource.close();
      };
    }
  }, [customerName, customer, tokens]);

  if (!authCheckComplete || firebaseLoading || (!isAuthenticated && !firebaseUser) || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading customer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate('/customers')}>
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  const hasFullAccess = googleStatus?.connected && googleStatus?.hasAdsAccess && googleStatus?.hasGTMAccess;
  
  const tabs = [
    { id: 'settings', label: 'Settings', description: 'Customer info and Google connection' },
    { id: 'analytics', label: 'Customer Analytics', description: 'Usage data for this customer' },
    { id: 'trackings', label: 'Current Trackings', description: 'All trackings with status' },
    { 
      id: 'create', 
      label: 'Create New Track', 
      description: hasFullAccess ? 'Simple form to create tracking' : 'Requires full Google access',
      disabled: !hasFullAccess
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Customer Name</label>
                  <p className="text-lg">{customer?.fullName || `${customer?.firstName} ${customer?.lastName}` || 'Unknown Customer'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <p className="text-lg">{customer?.email || 'No email'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Website URL</label>
                  <p className="text-lg text-blue-600">
                    {customer?.customFields?.websiteUrl || customer?.company || 'No website URL'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <p className="text-lg">{customer?.status || 'ACTIVE'}</p>
                </div>
              </div>
            </div>

            {/* Connection Progress Modal */}
            {isConnectingGoogle && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4 text-blue-900">Connecting to Google...</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    {progressSteps.oauth === 'success' ? (
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
                    ) : progressSteps.oauth === 'error' ? (
                      <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">✗</div>
                    ) : progressSteps.oauth === 'pending' ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                    )}
                    <span className={progressSteps.oauth === 'error' ? 'text-red-700' : 'text-gray-700'}>
                      Authorizing Google account...
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    {progressSteps.tokens === 'success' ? (
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
                    ) : progressSteps.tokens === 'error' ? (
                      <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">✗</div>
                    ) : progressSteps.tokens === 'pending' ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                    )}
                    <span className={progressSteps.tokens === 'error' ? 'text-red-700' : 'text-gray-700'}>
                      Storing OAuth tokens...
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    {progressSteps.ads === 'success' ? (
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
                    ) : progressSteps.ads === 'error' ? (
                      <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">✗</div>
                    ) : progressSteps.ads === 'pending' ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                    )}
                    <div className="flex-1">
                      <span className={progressSteps.ads === 'error' ? 'text-red-700' : 'text-gray-700'}>
                        Connecting to Google Ads...
                      </span>
                      {progressSteps.adsError && (
                        <p className="text-xs text-red-600 mt-1">{progressSteps.adsError}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {progressSteps.ga4 === 'success' ? (
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
                    ) : progressSteps.ga4 === 'error' ? (
                      <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs">!</div>
                    ) : progressSteps.ga4 === 'pending' ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                    )}
                    <div className="flex-1">
                      <span className={progressSteps.ga4 === 'error' ? 'text-yellow-700' : 'text-gray-700'}>
                        Connecting to Google Analytics 4...
                      </span>
                      {progressSteps.ga4Error && (
                        <p className="text-xs text-yellow-600 mt-1">{progressSteps.ga4Error} (Optional)</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {progressSteps.gtm === 'success' ? (
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
                    ) : progressSteps.gtm === 'error' ? (
                      <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">✗</div>
                    ) : progressSteps.gtm === 'pending' ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                    )}
                    <div className="flex-1">
                      <span className={progressSteps.gtm === 'error' ? 'text-red-700' : 'text-gray-700'}>
                        Setting up Google Tag Manager...
                      </span>
                      {progressSteps.gtmError && (
                        <p className="text-xs text-red-600 mt-1">{progressSteps.gtmError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Google Account Connection</h3>
              {googleStatus?.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="font-medium text-green-700">Connected</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{googleStatus.googleEmail}</p>
                      {googleStatus.connectedAt && (
                        <p className="text-xs text-muted-foreground">
                          Connected {new Date(googleStatus.connectedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDisconnectGoogle}
                      disabled={isConnectingGoogle}
                    >
                      {isConnectingGoogle ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-medium text-sm">Access Permissions</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${googleStatus.hasGTMAccess ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`text-sm ${googleStatus.hasGTMAccess ? 'text-green-700' : 'text-red-700'}`}>
                          Tag Manager {googleStatus.hasGTMAccess ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${googleStatus.hasGA4Access ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className={`text-sm ${googleStatus.hasGA4Access ? 'text-green-700' : 'text-gray-600'}`}>
                          Analytics 4 {googleStatus.hasGA4Access ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${googleStatus.hasAdsAccess ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`text-sm ${googleStatus.hasAdsAccess ? 'text-green-700' : 'text-red-700'}`}>
                          Google Ads {googleStatus.hasAdsAccess ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>

                    {!googleStatus.hasAdsAccess || !googleStatus.hasGTMAccess ? (
                      <div className="bg-yellow-50 p-3 rounded-md mt-3">
                        <p className="text-sm text-yellow-800 font-medium">Incomplete Access</p>
                        <p className="text-xs text-yellow-700">
                          Full access to Google Ads and Tag Manager is required for tracking to work properly.
                          {!googleStatus.hasGA4Access && ' GA4 is optional but recommended.'}
                        </p>
                        {/* Display specific error messages */}
                        {(googleStatus.gtmError || googleStatus.adsError || googleStatus.ga4Error) && (
                          <div className="mt-2 space-y-1">
                            {googleStatus.gtmError && (
                              <p className="text-xs text-red-700">
                                <strong>GTM Error:</strong> {googleStatus.gtmError}
                              </p>
                            )}
                            {googleStatus.adsError && (
                              <p className="text-xs text-red-700">
                                <strong>Google Ads Error:</strong> {googleStatus.adsError}
                              </p>
                            )}
                            {googleStatus.ga4Error && !googleStatus.hasGA4Access && (
                              <p className="text-xs text-yellow-700">
                                <strong>GA4:</strong> {googleStatus.ga4Error}
                              </p>
                            )}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={handleConnectGoogle}
                          disabled={isConnectingGoogle}
                        >
                          Reconnect with Full Access
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-green-50 p-3 rounded-md mt-3">
                        <p className="text-sm text-green-800 font-medium">Full Access Granted</p>
                        <p className="text-xs text-green-700">
                          Ready to create and manage tracking configurations.
                          {!googleStatus.hasGA4Access && ' Note: GA4 is not connected but optional.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Not Connected</p>
                    <p className="text-sm text-muted-foreground">Connect Google account to enable tracking</p>
                  </div>
                  <Button 
                    onClick={handleConnectGoogle}
                    disabled={isConnectingGoogle}
                  >
                    {isConnectingGoogle ? 'Connecting...' : 'Connect Google Account'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Total Trackings</h3>
                <p className="text-3xl font-bold text-primary">0</p>
              </div>
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Active Trackings</h3>
                <p className="text-3xl font-bold text-green-600">0</p>
              </div>
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Success Rate</h3>
                <p className="text-3xl font-bold text-blue-600">--%</p>
              </div>
            </div>
            
            <div className="bg-card p-12 rounded-lg border text-center">
              <p className="text-muted-foreground">No analytics data available yet</p>
              <p className="text-sm text-muted-foreground mt-2">Create trackings to see performance data</p>
            </div>
          </div>
        );
        
      case 'trackings':
        return (
          <div className="space-y-6">
            <div className="bg-card p-12 rounded-lg border text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">No trackings yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first tracking to start monitoring conversions.
                </p>
                <Button onClick={() => setActiveTab('create')}>
                  Create First Tracking
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 'create':
        return (
          <div className="space-y-6">
            {!hasFullAccess ? (
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-yellow-800">Full Google Access Required</h3>
                </div>
                <p className="text-yellow-700 mb-4">
                  To create tracking configurations, you need to connect Google account with both Google Ads and Tag Manager permissions.
                </p>
                <Button onClick={() => setActiveTab('settings')} variant="outline">
                  Go to Settings
                </Button>
              </div>
            ) : (
              <div className="bg-card p-8 rounded-lg border">
                <h3 className="text-lg font-semibold mb-6">Create New Tracking</h3>
                <form onSubmit={handleCreateTracking} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tracking Name</label>
                    <input
                      type="text"
                      value={trackingForm.name}
                      onChange={(e) => setTrackingForm({...trackingForm, name: e.target.value})}
                      placeholder="e.g., Checkout Button Click"
                      required
                      disabled={isCreatingTracking}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Tracking Type</label>
                    <select 
                      value={trackingForm.type}
                      onChange={(e) => setTrackingForm({...trackingForm, type: e.target.value})}
                      required
                      disabled={isCreatingTracking}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                    >
                      <option value="">Select tracking type</option>
                      <option value="button_click">Button Click</option>
                      <option value="page_view">Page View</option>
                      <option value="form_submit">Form Submit</option>
                      <option value="link_click">Link Click</option>
                      <option value="element_visibility">Element Visibility</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {trackingForm.type === 'page_view' ? 'URL Pattern' : 'CSS Selector'}
                    </label>
                    <input
                      type="text"
                      value={trackingForm.selector}
                      onChange={(e) => setTrackingForm({...trackingForm, selector: e.target.value})}
                      placeholder={
                        trackingForm.type === 'page_view' 
                          ? "e.g., /thank-you or /checkout/success" 
                          : "e.g., #checkout-button or .buy-now-btn"
                      }
                      required
                      disabled={isCreatingTracking}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {trackingForm.type === 'page_view' 
                        ? "URL path or pattern to track page visits"
                        : "CSS selector to identify the element to track"
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                    <textarea
                      value={trackingForm.description}
                      onChange={(e) => setTrackingForm({...trackingForm, description: e.target.value})}
                      placeholder="Describe what this tracking measures..."
                      disabled={isCreatingTracking}
                      rows={3}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="font-medium text-blue-900 mb-2">What OneClickTag will create:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• GTM trigger for {trackingForm.type || 'your tracking type'}</li>
                      <li>• GTM tag to fire the tracking event</li>
                      <li>• Google Ads conversion action</li>
                      <li>• Automatic linking between GTM and Google Ads</li>
                      <li>• Conversion tracking setup (typically takes 2-3 minutes)</li>
                    </ul>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      type="submit" 
                      disabled={isCreatingTracking || !trackingForm.name || !trackingForm.type || !trackingForm.selector}
                      className="flex-1"
                    >
                      {isCreatingTracking ? 'Creating Tracking...' : 'Create Tracking (2 minutes)'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setTrackingForm({ type: '', selector: '', name: '', description: '' })}
                      disabled={isCreatingTracking}
                    >
                      Clear Form
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{customerName?.replace(/-/g, ' ') || 'Customer'}</h1>
            <p className="text-muted-foreground mt-2">Manage tracking and Google integration</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/customers')}>
              Back to Customers
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`pb-2 font-medium transition-colors ${
                  tab.disabled 
                    ? 'border-b-2 border-transparent text-muted-foreground/50 cursor-not-allowed'
                    : activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
                }`}
                title={tab.disabled ? 'Requires full Google access (Ads + Tag Manager)' : tab.description}
              >
                {tab.label}
                {tab.disabled && <span className="ml-1 text-xs">🔒</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Disconnect Google Account Modal */}
        {showDisconnectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h2v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zm4 0a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Disconnect Google Account</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  Disconnecting will permanently remove:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• All tracking configurations</li>
                  <li>• Google Tag Manager triggers and tags</li>
                  <li>• Google Ads conversion actions</li>
                  <li>• OAuth access tokens</li>
                  <li>• Google account connection</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDisconnectModal(false)}
                  className="flex-1"
                  disabled={isConnectingGoogle}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmDisconnectGoogle}
                  className="flex-1"
                  disabled={isConnectingGoogle}
                >
                  {isConnectingGoogle ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}