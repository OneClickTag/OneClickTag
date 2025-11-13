import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useFirebaseAuth } from '@/lib/firebase/hooks/useFirebaseAuth';
import { customerService } from '@/lib/api/services/customerService';
import type { Customer } from '@/lib/api/types';

export function CustomersPage() {
  const { isAuthenticated, tokens } = useAuth();
  const { firebaseUser, loading: firebaseLoading } = useFirebaseAuth();
  const navigate = useNavigate();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch customers when switching to customers tab
  useEffect(() => {
    const fetchCustomers = async () => {
      if (activeTab !== 'customers' || !authCheckComplete || !isAuthenticated) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await customerService.getCustomers({ 
          limit: 50,
          search: searchQuery || undefined 
        });
        setCustomers(response.data.data || []);
      } catch (error: any) {
        console.error('Failed to fetch customers:', error);
        setError('Failed to load customers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [activeTab, authCheckComplete, isAuthenticated, searchQuery]);

  if (!authCheckComplete || firebaseLoading || (!isAuthenticated && !firebaseUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">All Customers</h1>
            <p className="text-muted-foreground mt-2">Manage your customer websites and tracking</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate('/customers/new')}>
              Create New Customer
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="flex space-x-8">
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`pb-2 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'border-b-2 border-primary text-primary'
                  : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Customer Analytics
            </button>
            <button 
              onClick={() => setActiveTab('customers')}
              className={`pb-2 font-medium transition-colors ${
                activeTab === 'customers'
                  ? 'border-b-2 border-primary text-primary'
                  : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              All Customers
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'analytics' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Total Customers</h3>
                <p className="text-3xl font-bold text-primary">{customers.length}</p>
                <p className="text-sm text-muted-foreground">Active websites</p>
              </div>
              
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Connected</h3>
                <p className="text-3xl font-bold text-green-600">0</p>
                <p className="text-sm text-muted-foreground">Google accounts linked</p>
              </div>
              
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Total Trackings</h3>
                <p className="text-3xl font-bold text-blue-600">0</p>
                <p className="text-sm text-muted-foreground">Conversion trackings</p>
              </div>
              
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Success Rate</h3>
                <p className="text-3xl font-bold text-purple-600">--%</p>
                <p className="text-sm text-muted-foreground">Sync success</p>
              </div>
            </div>

            {customers.length === 0 ? (
              <div className="bg-card p-12 rounded-lg border text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No customers yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start by creating your first customer to track conversions on their website.
                  </p>
                  <Button onClick={() => navigate('/customers/new')} size="lg">
                    Create Your First Customer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Customer Performance</h3>
                <p className="text-muted-foreground">Detailed analytics coming soon...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading customers...</p>
              </div>
            ) : error ? (
              <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md mb-6">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : customers.length === 0 ? (
              <div className="bg-card p-12 rounded-lg border text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No customers found</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first customer to get started with tracking.
                  </p>
                  <Button onClick={() => navigate('/customers/new')} size="lg">
                    Create First Customer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Search customers by name, email, or website..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {customers.length} customer{customers.length !== 1 ? 's' : ''} found
                    </p>
                    <Button onClick={() => navigate('/customers/new')} size="sm">
                      Add Customer
                    </Button>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  {customers.map((customer) => {
                    const customerName = `${customer.firstName}-${customer.lastName}`.toLowerCase().replace(/\s+/g, '-');
                    const websiteUrl = customer.customFields?.websiteUrl || customer.company || 'No website';
                    
                    return (
                      <div key={customer.id} className="bg-card p-6 rounded-lg border hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">
                                {customer.firstName} {customer.lastName}
                              </h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                customer.status === 'ACTIVE' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {customer.status || 'ACTIVE'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{customer.email}</p>
                            <p className="text-sm text-blue-600">{websiteUrl}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Created {new Date(customer.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/customer/${customerName}`)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}