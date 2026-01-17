import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './hooks/useAuth'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import AdminLoadingSpinner from './components/admin/AdminLoadingSpinner'
import { getHostAppContext } from './utils/host'
import { useAuth } from './hooks/useAuth'

// Marketing Page
import Marketing from './pages/Marketing'

// Auth Pages
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AcceptInvite from './pages/AcceptInvite'
import AuthCallback from './pages/AuthCallback'
import ConfirmEmail from './pages/ConfirmEmail'
import Unauthorized from './pages/Unauthorized'

// Main Pages (keep unchanged - Tailwind CSS)
import Dashboard from './pages/Dashboard'
import Children from './pages/Children'
import JoinTeam from './pages/JoinTeam'
import Calendar from './pages/Calendar'
import EventDetail from './pages/EventDetail'
import MyPayments from './pages/MyPayments'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancel from './pages/PaymentCancel'
import Settings from './pages/Settings'
import Uniforms from './pages/Uniforms'
import Travel from './pages/Travel'
import TravelDetail from './pages/TravelDetail'
import Tryouts from './pages/Tryouts'
import TryoutDetail from './pages/TryoutDetail'
import Messages from './pages/Messages'
import AnnouncementDetail from './pages/AnnouncementDetail'
import { RoleSelection } from './pages/RoleSelection'

// Admin Layout (Material Dashboard)
import AdminLayout from './layouts/AdminLayout'

// Platform Admin Layout
const PlatformAdminLayout = lazy(() => import('./layouts/PlatformAdminLayout'))

// Platform Admin Pages - Lazy loaded for code splitting
const PlatformAdminDashboard = lazy(() => import('./pages/platformAdmin/PlatformAdminDashboard'))
const PlatformOrganizations = lazy(() => import('./pages/platformAdmin/Organizations'))
const PlatformOrganizationDetail = lazy(() => import('./pages/platformAdmin/OrganizationDetail'))
const PlatformUsers = lazy(() => import('./pages/platformAdmin/Users'))
const PlatformUserDetail = lazy(() => import('./pages/platformAdmin/UserDetail'))
const PlatformStructure = lazy(() => import('./pages/platformAdmin/Structure'))
const PlatformPayments = lazy(() => import('./pages/platformAdmin/PlatformPayments'))
const PlatformFees = lazy(() => import('./pages/platformAdmin/Fees'))
const PlatformEventLog = lazy(() => import('./pages/platformAdmin/EventLog'))
const PlatformFeatureFlags = lazy(() => import('./pages/platformAdmin/FeatureFlags'))
const PlatformAdmins = lazy(() => import('./pages/platformAdmin/PlatformAdmins'))
const LicensesOverview = lazy(() => import('./pages/platformAdmin/LicensesOverview'))
const LicenseTiers = lazy(() => import('./pages/platformAdmin/LicenseTiers'))
const LicenseTierDetail = lazy(() => import('./pages/platformAdmin/LicenseTierDetail'))
const FeatureCatalog = lazy(() => import('./pages/platformAdmin/FeatureCatalog'))
const FeatureDetail = lazy(() => import('./pages/platformAdmin/FeatureDetail'))
const Overrides = lazy(() => import('./pages/platformAdmin/Overrides'))
const OverrideCreate = lazy(() => import('./pages/platformAdmin/OverrideCreate'))
const OverrideDetail = lazy(() => import('./pages/platformAdmin/OverrideDetail'))
const LicensesAudit = lazy(() => import('./pages/platformAdmin/LicensesAudit'))

// Admin Pages - Lazy loaded for code splitting
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const CreateUser = lazy(() => import('./pages/admin/CreateUser'))
const Teams = lazy(() => import('./pages/admin/Teams'))
const TeamDetail = lazy(() => import('./pages/admin/TeamDetail'))
const Roster = lazy(() => import('./pages/admin/Roster'))
const Events = lazy(() => import('./pages/admin/Events'))
const CreateEvent = lazy(() => import('./pages/admin/CreateEvent'))
const AttendanceRoster = lazy(() => import('./pages/admin/AttendanceRoster'))
const Payments = lazy(() => import('./pages/admin/Payments'))
const CreateFee = lazy(() => import('./pages/admin/CreateFee'))
const UniformOrders = lazy(() => import('./pages/admin/UniformOrders'))
const TravelPlans = lazy(() => import('./pages/admin/TravelPlans'))
const CreateTravelPlan = lazy(() => import('./pages/admin/CreateTravelPlan'))
const EditTravelPlan = lazy(() => import('./pages/admin/EditTravelPlan'))
const AdminTryouts = lazy(() => import('./pages/admin/AdminTryouts'))
const AdminTryoutDetail = lazy(() => import('./pages/admin/AdminTryoutDetail'))
const OrganizationSettings = lazy(() => import('./pages/admin/OrganizationSettings'))
const OrganizationUsers = lazy(() => import('./pages/admin/OrganizationUsers'))
const OrganizationOnboarding = lazy(() => import('./pages/admin/OrganizationOnboarding'))
const OrganizationBilling = lazy(() => import('./pages/admin/OrganizationBilling'))
const PlanSelection = lazy(() => import('./pages/admin/PlanSelection'))
const CheckoutSuccess = lazy(() => import('./pages/admin/CheckoutSuccess'))
const CheckoutCancel = lazy(() => import('./pages/admin/CheckoutCancel'))

function HostHomeRoute() {
  const appContext = getHostAppContext()
  if (appContext === 'platform') return <Navigate to="/portal/dashboard" replace />
  if (appContext === 'platform-admin') return <Navigate to="/platform-admin" replace />
  return <Marketing />
}

function PlatformAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AdminLoadingSpinner />
  if (!user) return <Navigate to="/portal/login" state={{ from: location }} replace />
  if (!profile) return <AdminLoadingSpinner />
  if (!profile.isPlatformAdmin) return <Navigate to="/portal/unauthorized" replace />

  return <>{children}</>
}

function HostGateLayout() {
  const appContext = getHostAppContext()
  const location = useLocation()

  // Only enforce strict separation on the admin subdomain.
  if (appContext !== 'platform-admin') return <Outlet />

  const path = location.pathname
  const isPortal = path.startsWith('/portal')
  const isOrgAdmin = path.startsWith('/admin')
  const isPlatformAdmin = path.startsWith('/platform-admin')

  // Allow a small set of portal routes on admin.* for authentication flows only.
  if (isPortal) {
    const allowlisted = [
      '/portal/login',
      '/portal/signup',
      '/portal/forgot-password',
      '/portal/reset-password',
      '/portal/auth/callback',
      '/portal/confirm-email',
      '/portal/unauthorized',
      '/portal/accept-invite',
    ]

    if (allowlisted.some((p) => path.startsWith(p))) return <Outlet />
    return <Navigate to="/platform-admin" replace />
  }

  // Never allow org-admin UI on admin.* (platform admin host).
  if (isOrgAdmin) return <Navigate to="/platform-admin" replace />

  // Allow platform-admin routes.
  if (isPlatformAdmin) return <Outlet />

  return <Outlet />
}

function App() {
  return (
    <OrganizationProvider>
      <AuthProvider>
        <Routes>
          {/* Marketing Landing Page - Public */}
          <Route path="/" element={<HostHomeRoute />} />

          {/* Portal Routes - Parents/Coaches */}
          <Route path="/portal" element={<HostGateLayout />}>
            {/* Public Auth Routes */}
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="accept-invite" element={<AcceptInvite />} />
            <Route path="auth/callback" element={<AuthCallback />} />
            <Route path="confirm-email" element={<ConfirmEmail />} />
            <Route path="unauthorized" element={<Unauthorized />} />

            {/* Protected Portal Routes */}
            <Route path="role-selection" element={<ProtectedRoute><RoleSelection /></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="children" element={<ProtectedRoute><Children /></ProtectedRoute>} />
            <Route path="join" element={<ProtectedRoute><JoinTeam /></ProtectedRoute>} />
            <Route path="calendar/events/:eventId" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
            <Route path="calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
            <Route path="payments" element={<ProtectedRoute><MyPayments /></ProtectedRoute>} />
            <Route path="payments/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
            <Route path="payments/cancel" element={<ProtectedRoute><PaymentCancel /></ProtectedRoute>} />
            <Route path="uniforms" element={<ProtectedRoute><Uniforms /></ProtectedRoute>} />
            <Route path="travel" element={<ProtectedRoute><Travel /></ProtectedRoute>} />
            <Route path="travel/:id" element={<ProtectedRoute><TravelDetail /></ProtectedRoute>} />
            <Route path="tryouts" element={<ProtectedRoute><Tryouts /></ProtectedRoute>} />
            <Route path="tryouts/:tryoutId" element={<ProtectedRoute><TryoutDetail /></ProtectedRoute>} />
            <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="messages/:announcementId" element={<ProtectedRoute><AnnouncementDetail /></ProtectedRoute>} />
            
            {/* Redirect root portal to dashboard */}
            <Route index element={<Navigate to="/portal/dashboard" replace />} />

            {/* Catch-all to prevent blank/\"blue\" screens on unknown portal routes */}
            <Route path="*" element={<Navigate to="/portal/dashboard" replace />} />
          </Route>

          {/* Organization Onboarding - Standalone route outside AdminLayout */}
          {/* Allow unauthenticated access - will prompt for login/signup when submitting */}
          <Route
            path="/admin/onboarding"
            element={
              <Suspense fallback={<AdminLoadingSpinner />}>
                <OrganizationOnboarding />
              </Suspense>
            }
          />

          {/* Admin Routes - Material Dashboard Layout with nested routing */}
          <Route
            path="/admin"
            element={
              <HostGateLayout />
            }
          >
            <Route
              element={
                <ProtectedRoute allowedRoles={['admin', 'org_admin']}>
                  <Suspense fallback={<AdminLoadingSpinner />}>
                    <AdminLayout />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              {/* Admin Dashboard */}
              <Route index element={<AdminDashboard />} />
            
              {/* Teams */}
              <Route path="teams" element={<Teams />} />
              <Route path="teams/:id" element={<TeamDetail />} />
              <Route path="teams/:id/roster" element={<Roster />} />
            
              {/* Events */}
              <Route path="events" element={<Events />} />
              <Route path="events/new" element={<CreateEvent />} />
              <Route path="events/:id/attendance" element={<AttendanceRoster />} />
            
              {/* Payments */}
              <Route path="payments" element={<Payments />} />
              <Route path="payments/new" element={<CreateFee />} />
            
              {/* Uniforms */}
              <Route path="uniforms" element={<UniformOrders />} />
              <Route path="uniforms/:kitId" element={<UniformOrders />} />
            
              {/* Travel */}
              <Route path="travel" element={<TravelPlans />} />
              <Route path="travel/new" element={<CreateTravelPlan />} />
              <Route path="travel/:id" element={<EditTravelPlan />} />
            
              {/* Tryouts */}
              <Route path="tryouts" element={<AdminTryouts />} />
              <Route path="tryouts/:tryoutId" element={<AdminTryoutDetail />} />
            
              {/* Users */}
              <Route path="users/new" element={<CreateUser />} />
            
              {/* Organization */}
              <Route path="organization" element={<OrganizationSettings />} />
              <Route path="organization/users" element={<OrganizationUsers />} />
              <Route path="organization/billing" element={<OrganizationBilling />} />
              <Route path="organization/billing/plan-selection" element={<PlanSelection />} />
              <Route path="organization/billing/checkout/success" element={<CheckoutSuccess />} />
              <Route path="organization/billing/checkout/cancel" element={<CheckoutCancel />} />
            </Route>
          </Route>

          {/* Platform Admin Routes - restricted to platform admins */}
          <Route
            path="/platform-admin"
            element={
              <HostGateLayout />
            }
          >
            <Route
              element={
                <PlatformAdminRoute>
                  <Suspense fallback={<AdminLoadingSpinner />}>
                    <PlatformAdminLayout />
                  </Suspense>
                </PlatformAdminRoute>
              }
            >
              {/* Dashboard */}
              <Route index element={<PlatformAdminDashboard />} />
              
              {/* Organizations */}
              <Route path="organizations" element={<PlatformOrganizations />} />
              <Route path="organizations/:id" element={<PlatformOrganizationDetail />} />
              
              {/* Users */}
              <Route path="users" element={<PlatformUsers />} />
              <Route path="users/:id" element={<PlatformUserDetail />} />
              
              {/* Structure */}
              <Route path="structure" element={<PlatformStructure />} />
              
              {/* Payments */}
              <Route path="payments" element={<PlatformPayments />} />
              
              {/* Fees */}
              <Route path="fees" element={<PlatformFees />} />
              
              {/* Event Log */}
              <Route path="audit" element={<PlatformEventLog />} />
              
              {/* Feature Flags */}
              <Route path="feature-flags" element={<PlatformFeatureFlags />} />
              
              {/* Platform Admins */}
              <Route path="admins" element={<PlatformAdmins />} />
              
              {/* Licenses & Entitlements */}
              <Route path="licenses" element={<LicensesOverview />} />
              <Route path="licenses/tiers" element={<LicenseTiers />} />
              <Route path="licenses/tiers/:id" element={<LicenseTierDetail />} />
              <Route path="licenses/features" element={<FeatureCatalog />} />
              <Route path="licenses/features/:id" element={<FeatureDetail />} />
              <Route path="licenses/overrides" element={<Overrides />} />
              <Route path="licenses/overrides/new" element={<OverrideCreate />} />
              <Route path="licenses/overrides/:id" element={<OverrideDetail />} />
              <Route path="licenses/audit" element={<LicensesAudit />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </OrganizationProvider>
  )
}

export default App
