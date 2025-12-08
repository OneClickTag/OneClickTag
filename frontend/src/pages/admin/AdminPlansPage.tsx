import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, RefreshCw, Star } from 'lucide-react';
import { EditPlanModal } from '@/components/admin/EditPlanModal';
import { adminPlansService, Plan } from '@/lib/api/services/admin';

export function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await adminPlansService.getAll();
      console.log('💳 Plans received:', data);
      console.log('💳 Is array?', Array.isArray(data));
      console.log('💳 Data type:', typeof data);

      // Handle different response formats
      if (Array.isArray(data)) {
        // Parse features if they're JSON strings
        const parsedPlans = data.map((plan: any) => ({
          ...plan,
          features: typeof plan.features === 'string'
            ? JSON.parse(plan.features)
            : plan.features
        }));
        setPlans(parsedPlans);
      } else if (data && typeof data === 'object' && 'data' in data) {
        // Handle wrapped response
        const wrapped = data as any;
        const plans = Array.isArray(wrapped.data) ? wrapped.data : [];
        const parsedPlans = plans.map((plan: any) => ({
          ...plan,
          features: typeof plan.features === 'string'
            ? JSON.parse(plan.features)
            : plan.features
        }));
        setPlans(parsedPlans);
      } else {
        console.warn('Unexpected data format:', data);
        setPlans([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch plans:', error);
      console.error('Error details:', error?.response?.data);
      setPlans([]); // Set to empty array on error
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        alert('Access denied. Please logout and login again to refresh your permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleToggleActive = async (planId: string, currentStatus: boolean) => {
    try {
      await adminPlansService.toggleActive(planId, { isActive: !currentStatus });
      fetchPlans();
    } catch (error) {
      console.error('Failed to update plan status:', error);
      alert('Failed to update plan status');
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      await adminPlansService.delete(planId);
      alert('Plan deleted successfully');
      fetchPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
      alert('Failed to delete plan');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  const handleSavePlan = async (planData: Partial<Plan>) => {
    try {
      if (editingPlan) {
        // Update existing plan
        await adminPlansService.update(editingPlan.id, planData);
      } else {
        // Create new plan
        await adminPlansService.create(planData as any);
      }
      fetchPlans();
    } catch (error) {
      console.error('Failed to save plan:', error);
      throw error;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Plans Management</h2>
            <p className="text-gray-600 mt-1">Manage pricing plans and features</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchPlans} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <Button onClick={handleOpenCreateModal} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>New Plan</span>
            </Button>
          </div>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No plans found</p>
            <Button className="mt-4">Create First Plan</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                  plan.isFeatured ? 'border-blue-500' : 'border-gray-200'
                } hover:shadow-md transition-shadow`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    {plan.isFeatured && (
                      <div className="flex items-center space-x-1 text-sm text-blue-600 mt-1">
                        <Star className="w-4 h-4 fill-current" />
                        <span>Featured</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleActive(plan.id, plan.isActive)}
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      plan.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600 ml-2">
                      /{plan.billingPeriod.toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {plan.description}
                </p>

                {/* Features */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                    Features ({plan.features.length})
                  </p>
                  <ul className="space-y-1">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="flex-1">{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-sm text-gray-500 italic">
                        +{plan.features.length - 4} more...
                      </li>
                    )}
                  </ul>
                </div>

                {/* CTA */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Call to Action</div>
                  <div className="font-medium text-gray-900">{plan.ctaText}</div>
                  {plan.ctaUrl && (
                    <div className="text-xs text-gray-500 mt-1 truncate">{plan.ctaUrl}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleOpenEditModal(plan)}
                    className="flex-1 text-blue-600 hover:text-blue-900 text-sm font-medium py-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="flex-1 text-red-600 hover:text-red-900 text-sm font-medium py-2"
                  >
                    Delete
                  </button>
                </div>

                {/* Meta */}
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                  <div>Order: {plan.order}</div>
                  <div>Updated: {new Date(plan.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Plans are displayed on the <code className="bg-blue-100 px-2 py-1 rounded">/plans</code> page.
            Toggle active status to show or hide plans from the public site.
          </p>
        </div>

        {/* Edit Plan Modal */}
        <EditPlanModal
          plan={editingPlan}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSavePlan}
        />
      </div>
    </AdminLayout>
  );
}
