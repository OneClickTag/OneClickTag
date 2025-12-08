import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useFirebaseAuth } from '@/lib/firebase/hooks/useFirebaseAuth';
import { customersApi } from '@/lib/api/services';
import { tokenManager } from '@/lib/api/auth/tokenManager';
import { firebaseAuthService } from '@/lib/firebase/authService';

export function CreateCustomerPage() {
  const { isAuthenticated } = useAuth();
  const { firebaseUser, loading: firebaseLoading } = useFirebaseAuth();
  const navigate = useNavigate();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefreshSession = async () => {
    try {
      // Clear current tokens
      tokenManager.clearTokens();
      
      // Re-authenticate with Firebase if user is still signed in
      if (firebaseUser) {
        await firebaseAuthService.authenticateWithBackend(firebaseUser);
        setError(null);
        // Try creating customer again after refresh
        window.location.reload();
      } else {
        // Redirect to login if no Firebase user
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      setError('Failed to refresh session. Please sign out and sign back in.');
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

  if (!authCheckComplete || firebaseLoading || (!isAuthenticated && !firebaseUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const customer = await customersApi.createCustomer({
        name: name.trim(),
        email,
        website: websiteUrl,
        company: websiteUrl, // Store website URL in company field for now
      });

      if (customer) {
        // Navigate to the customer's detail page using slug
        navigate(`/customer/${customer.slug}`);
      }
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      
      // If it's a tenant context error, offer to refresh session
      if (error.message?.includes('Tenant context') || error.message?.includes('tenant assigned')) {
        setError('Account setup needed. Click "Refresh Session" to complete setup.');
      } else {
        setError(error.message || 'Failed to create customer. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Create New Customer</h1>
            <p className="text-muted-foreground mt-2">Add a website to start tracking conversions</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/customers')}>
            Cancel
          </Button>
        </div>

        <div className="bg-card p-8 rounded-lg border">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-6">
              <p>{error}</p>
              {error.includes('Account setup needed') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshSession}
                  className="mt-2"
                >
                  Refresh Session
                </Button>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Customer Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Doe"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Full name of the customer
              </p>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Customer Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Customer's email address
              </p>
            </div>
            
            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium mb-2">
                Website URL
              </label>
              <input
                id="websiteUrl"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
              />
              <p className="text-sm text-muted-foreground mt-1">
                The website where you want to track conversions
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Customer will be created in your account</li>
                <li>2. You'll connect their Google account (Ads & GTM)</li>
                <li>3. You can start creating tracking tags</li>
              </ol>
            </div>
            
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Creating Customer...' : 'Create Customer'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/customers')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}