import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useFirebaseAuth } from '@/lib/firebase/hooks/useFirebaseAuth';
import { tokenManager } from '@/lib/api/auth/tokenManager';
import { firebaseAuthService } from '@/lib/firebase/authService';

export function DashboardPage() {
  const { isAuthenticated, tokens } = useAuth();
  const { firebaseUser, loading: firebaseLoading } = useFirebaseAuth();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await firebaseAuthService.signOut();
      tokenManager.clearTokens();
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  useEffect(() => {
    // Give more time for authentication to settle (especially after login)
    const timer = setTimeout(() => {
      setAuthCheckComplete(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only redirect after auth check is complete and we're absolutely sure user is not authenticated
    if (authCheckComplete && !isAuthenticated && !firebaseUser && !firebaseLoading) {
      console.log('Dashboard: Redirecting to login - not authenticated');
      console.log('Auth state:', { isAuthenticated, firebaseUser: !!firebaseUser, tokens: !!tokens });
      
      // Double check that we're not in the middle of authentication process
      const isOnAuthFlow = sessionStorage.getItem('authInProgress') === 'true';
      if (!isOnAuthFlow) {
        window.location.href = '/login';
      }
    }
  }, [authCheckComplete, isAuthenticated, firebaseUser, firebaseLoading, tokens]);

  // Show loading while checking auth
  if (!authCheckComplete || firebaseLoading || (!isAuthenticated && !firebaseUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
          <p className="text-xs text-gray-500 mt-2">
            Auth: {isAuthenticated ? 'Yes' : 'No'} | Firebase: {firebaseUser ? 'Yes' : 'No'} | Tokens: {tokens ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            {firebaseUser && (
              <p className="text-sm text-green-600">
                Signed in as: {firebaseUser.email}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Customers</h3>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground">Total customers</p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Active Trackings</h3>
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-sm text-muted-foreground">Synced trackings</p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Connected Accounts</h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-muted-foreground">Google accounts linked</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/customers/new')}
                className="w-full text-left p-3 bg-primary/5 hover:bg-primary/10 rounded-md transition-colors"
              >
                <div className="font-medium">Create New Customer</div>
                <div className="text-sm text-muted-foreground">Add a website to track</div>
              </button>
              <button 
                onClick={() => navigate('/customers')}
                className="w-full text-left p-3 bg-secondary/50 hover:bg-secondary/70 rounded-md transition-colors"
              >
                <div className="font-medium">View All Customers</div>
                <div className="text-sm text-muted-foreground">Manage your customer list</div>
              </button>
              <button 
                onClick={() => navigate('/analytics')}
                className="w-full text-left p-3 bg-secondary/50 hover:bg-secondary/70 rounded-md transition-colors"
              >
                <div className="font-medium">Analytics Overview</div>
                <div className="text-sm text-muted-foreground">View tracking performance</div>
              </button>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="text-center text-muted-foreground py-8">
                <p>No recent activity</p>
                <p className="text-sm mt-2">Start by creating your first customer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="mt-8 bg-gradient-to-r from-primary/10 to-blue-500/10 p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Getting Started with OneClickTag</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <h4 className="font-medium">Create Customer</h4>
                <p className="text-sm text-muted-foreground">Add a website you want to track</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <h4 className="font-medium">Connect Google</h4>
                <p className="text-sm text-muted-foreground">Link Google Ads & GTM accounts</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <h4 className="font-medium">Create Tracking</h4>
                <p className="text-sm text-muted-foreground">Set up conversion tracking in 2 minutes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}