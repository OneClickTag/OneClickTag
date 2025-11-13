import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useFirebaseAuth } from '@/lib/firebase/hooks/useFirebaseAuth';

export function AnalyticsPage() {
  const { isAuthenticated, tokens } = useAuth();
  const { firebaseUser, loading: firebaseLoading } = useFirebaseAuth();
  const navigate = useNavigate();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

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
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Analytics Overview</h1>
            <p className="text-muted-foreground mt-2">Track your conversion tracking performance</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Total Customers</h3>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground">Active websites</p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Total Trackings</h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-muted-foreground">Conversion events</p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Success Rate</h3>
            <p className="text-3xl font-bold text-green-600">--%</p>
            <p className="text-sm text-muted-foreground">Successful syncs</p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Active This Month</h3>
            <p className="text-3xl font-bold text-purple-600">0</p>
            <p className="text-sm text-muted-foreground">Customers with activity</p>
          </div>
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Tracking Performance</h3>
            <div className="h-64 bg-secondary/20 rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Chart will appear here when you have data</p>
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Customer Activity</h3>
            <div className="h-64 bg-secondary/20 rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Chart will appear here when you have data</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-card p-12 rounded-lg border text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No analytics data yet</h3>
            <p className="text-muted-foreground mb-6">
              Create customers and tracking to see detailed analytics and performance metrics.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/customers/new')}>
                Create Customer
              </Button>
              <Button variant="outline" onClick={() => navigate('/customers')}>
                View Customers
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}