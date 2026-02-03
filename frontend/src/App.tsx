import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ScrollToTop } from './components/ScrollToTop'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { CookieConsentBanner } from './components/consent/CookieConsentBanner'

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

// Lazy load early access pages
const EarlyAccessPage = lazy(() => import('./pages/EarlyAccessPage').then(m => ({ default: m.EarlyAccessPage })))
const QuestionnairePage = lazy(() => import('./pages/QuestionnairePage').then(m => ({ default: m.QuestionnairePage })))
const ThankYouPage = lazy(() => import('./pages/ThankYouPage').then(m => ({ default: m.ThankYouPage })))

// Lazy load admin pages (rarely used, heavy features)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminContentPage = lazy(() => import('./pages/admin/AdminContentPage').then(m => ({ default: m.AdminContentPage })))
const AdminPlansPage = lazy(() => import('./pages/admin/AdminPlansPage').then(m => ({ default: m.AdminPlansPage })))
const AdminFooterPage = lazy(() => import('./pages/admin/AdminFooterPage').then(m => ({ default: m.AdminFooterPage })))
const AdminLandingPage = lazy(() => import('./pages/admin/AdminLandingPage').then(m => ({ default: m.AdminLandingPage })))
const AdminSiteSettingsPage = lazy(() => import('./pages/admin/AdminSiteSettingsPage').then(m => ({ default: m.AdminSiteSettingsPage })))
const AdminContactPage = lazy(() => import('./pages/admin/AdminContactPage').then(m => ({ default: m.AdminContactPage })))
const AdminLeadsPage = lazy(() => import('./pages/admin/AdminLeadsPage').then(m => ({ default: m.AdminLeadsPage })))
const AdminLeadDetailPage = lazy(() => import('./pages/admin/AdminLeadDetailPage').then(m => ({ default: m.AdminLeadDetailPage })))
const AdminLeadsAnalyticsPage = lazy(() => import('./pages/admin/AdminLeadsAnalyticsPage').then(m => ({ default: m.AdminLeadsAnalyticsPage })))
const AdminQuestionnairePage = lazy(() => import('./pages/admin/AdminQuestionnairePage').then(m => ({ default: m.AdminQuestionnairePage })))
const AdminEmailTemplatesPage = lazy(() => import('./pages/admin/AdminEmailTemplatesPage').then(m => ({ default: m.AdminEmailTemplatesPage })))
const AdminRoute = lazy(() => import('./components/AdminRoute').then(m => ({ default: m.AdminRoute })))
const EarlyAccessGuard = lazy(() => import('./components/EarlyAccessGuard').then(m => ({ default: m.EarlyAccessGuard })))

// Lazy load compliance pages
const ComplianceSettingsPage = lazy(() => import('./pages/compliance').then(m => ({ default: m.ComplianceSettingsPage })))
const CookieCategoriesPage = lazy(() => import('./pages/compliance').then(m => ({ default: m.CookieCategoriesPage })))
const CookiesPage = lazy(() => import('./pages/compliance').then(m => ({ default: m.CookiesPage })))
const CookieBannerPage = lazy(() => import('./pages/compliance').then(m => ({ default: m.CookieBannerPage })))
const DataRequestsPage = lazy(() => import('./pages/compliance').then(m => ({ default: m.DataRequestsPage })))
const ApiAuditLogsPage = lazy(() => import('./pages/compliance').then(m => ({ default: m.ApiAuditLogsPage })))
const UserConsentsPage = lazy(() => import('./pages/admin/compliance/UserConsentsPage').then(m => ({ default: m.UserConsentsPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

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
          {/* Public Routes - Always accessible */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          {/* Keep generic content route for other dynamic pages */}
          <Route path="/content/:slug" element={<ContentPage />} />

          {/* Auth Routes - Always accessible (admins need to register/login) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

          {/* Protected Routes - Only accessible in early access mode to admins */}
          <Route path="/plans" element={<EarlyAccessGuard><PlansPage /></EarlyAccessGuard>} />

          {/* Early Access Routes - Always accessible */}
          <Route path="/early-access" element={<EarlyAccessPage />} />
          <Route path="/questionnaire/:leadId" element={<QuestionnairePage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />

          {/* App Routes - Protected in Early Access Mode (Admin only) */}
          <Route path="/dashboard" element={<EarlyAccessGuard><DashboardPage /></EarlyAccessGuard>} />
          <Route path="/customers" element={<EarlyAccessGuard><CustomersPage /></EarlyAccessGuard>} />
          <Route path="/customers/new" element={<EarlyAccessGuard><CreateCustomerPage /></EarlyAccessGuard>} />
          <Route path="/customer/:customerName" element={<EarlyAccessGuard><CustomerDetailPage /></EarlyAccessGuard>} />
          <Route path="/analytics" element={<EarlyAccessGuard><AnalyticsPage /></EarlyAccessGuard>} />

          {/* Admin Routes - Protected */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
          <Route path="/admin/content" element={<AdminRoute><AdminContentPage /></AdminRoute>} />
          <Route path="/admin/plans" element={<AdminRoute><AdminPlansPage /></AdminRoute>} />
          <Route path="/admin/landing" element={<AdminRoute><AdminLandingPage /></AdminRoute>} />
          <Route path="/admin/site-settings" element={<AdminRoute><AdminSiteSettingsPage /></AdminRoute>} />
          <Route path="/admin/contact-page" element={<AdminRoute><AdminContactPage /></AdminRoute>} />
          <Route path="/admin/footer" element={<AdminRoute><AdminFooterPage /></AdminRoute>} />
          <Route path="/admin/leads" element={<AdminRoute><AdminLeadsPage /></AdminRoute>} />
          <Route path="/admin/leads/:id" element={<AdminRoute><AdminLeadDetailPage /></AdminRoute>} />
          <Route path="/admin/leads/analytics" element={<AdminRoute><AdminLeadsAnalyticsPage /></AdminRoute>} />
          <Route path="/admin/questionnaire" element={<AdminRoute><AdminQuestionnairePage /></AdminRoute>} />
          <Route path="/admin/email-templates" element={<AdminRoute><AdminEmailTemplatesPage /></AdminRoute>} />

          {/* Compliance Routes - Protected */}
          <Route path="/admin/compliance/settings" element={<AdminRoute><ComplianceSettingsPage /></AdminRoute>} />
          <Route path="/admin/compliance/cookie-categories" element={<AdminRoute><CookieCategoriesPage /></AdminRoute>} />
          <Route path="/admin/compliance/cookies" element={<AdminRoute><CookiesPage /></AdminRoute>} />
          <Route path="/admin/compliance/cookie-banner" element={<AdminRoute><CookieBannerPage /></AdminRoute>} />
          <Route path="/admin/compliance/user-consents" element={<AdminRoute><UserConsentsPage /></AdminRoute>} />
          <Route path="/admin/compliance/data-requests" element={<AdminRoute><DataRequestsPage /></AdminRoute>} />
          <Route path="/admin/compliance/audit-logs" element={<AdminRoute><ApiAuditLogsPage /></AdminRoute>} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      {/* Cookie Consent Banner - Shows to all visitors */}
      {/* TODO: Get tenantId from auth context or environment */}
      <CookieConsentBanner tenantId="cmhz31nx20000hl6ugujxj4lf" />
    </div>
  )
}

export default App