import { Routes, Route } from 'react-router-dom'
import { ScrollToTop } from './components/ScrollToTop'
import { LandingPage } from './pages/LandingPage'
import { ContentPage } from './pages/ContentPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { TermsPage } from './pages/TermsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { PlansPage } from './pages/PlansPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { CustomersPage } from './pages/CustomersPage'
import { CreateCustomerPage } from './pages/CreateCustomerPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminContentPage } from './pages/admin/AdminContentPage'
import { AdminPlansPage } from './pages/admin/AdminPlansPage'
import { AdminFooterPage } from './pages/admin/AdminFooterPage'
import { AdminLandingPage } from './pages/admin/AdminLandingPage'
import { AdminSiteSettingsPage } from './pages/admin/AdminSiteSettingsPage'
import { AdminContactPage } from './pages/admin/AdminContactPage'
import { AdminRoute } from './components/AdminRoute'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        {/* Keep generic content route for other dynamic pages */}
        <Route path="/content/:slug" element={<ContentPage />} />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

        {/* App Routes */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/new" element={<CreateCustomerPage />} />
        <Route path="/customer/:customerName" element={<CustomerDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />

        {/* Admin Routes - Protected */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="/admin/content" element={<AdminRoute><AdminContentPage /></AdminRoute>} />
        <Route path="/admin/plans" element={<AdminRoute><AdminPlansPage /></AdminRoute>} />
        <Route path="/admin/landing" element={<AdminRoute><AdminLandingPage /></AdminRoute>} />
        <Route path="/admin/site-settings" element={<AdminRoute><AdminSiteSettingsPage /></AdminRoute>} />
        <Route path="/admin/contact-page" element={<AdminRoute><AdminContactPage /></AdminRoute>} />
        <Route path="/admin/footer" element={<AdminRoute><AdminFooterPage /></AdminRoute>} />
      </Routes>
    </div>
  )
}

export default App