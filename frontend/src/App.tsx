import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ScrollToTop } from './components/ScrollToTop'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

// Lazy load heavy pages to reduce initial bundle size
const ContentPage = lazy(() => import('./pages/ContentPage').then(m => ({ default: m.ContentPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })))
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const PlansPage = lazy(() => import('./pages/PlansPage').then(m => ({ default: m.PlansPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })))
const CreateCustomerPage = lazy(() => import('./pages/CreateCustomerPage').then(m => ({ default: m.CreateCustomerPage })))
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage').then(m => ({ default: m.OAuthCallbackPage })))

// Lazy load admin pages (rarely used, heavy features)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminContentPage = lazy(() => import('./pages/admin/AdminContentPage').then(m => ({ default: m.AdminContentPage })))
const AdminPlansPage = lazy(() => import('./pages/admin/AdminPlansPage').then(m => ({ default: m.AdminPlansPage })))
const AdminFooterPage = lazy(() => import('./pages/admin/AdminFooterPage').then(m => ({ default: m.AdminFooterPage })))
const AdminLandingPage = lazy(() => import('./pages/admin/AdminLandingPage').then(m => ({ default: m.AdminLandingPage })))
const AdminSiteSettingsPage = lazy(() => import('./pages/admin/AdminSiteSettingsPage').then(m => ({ default: m.AdminSiteSettingsPage })))
const AdminContactPage = lazy(() => import('./pages/admin/AdminContactPage').then(m => ({ default: m.AdminContactPage })))
const AdminRoute = lazy(() => import('./components/AdminRoute').then(m => ({ default: m.AdminRoute })))

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
)

function App() {
  return (
    <div className="min-h-screen bg-background">
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </div>
  )
}

export default App