import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import AdminLoadingSpinner from './components/admin/AdminLoadingSpinner'
import { getHostAppContext } from './utils/host'
import { useOrganizationTheme } from './hooks/useOrganizationTheme'
import { getLink, getPath, RouteKeys } from './utils/routes'
import { Toaster } from './components/Toaster'

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
import Athletes from './pages/Athletes'
import JoinTeam from './pages/JoinTeam'
import Calendar from './pages/Calendar'
import EventDetail from './pages/EventDetail'
import MyPayments from './pages/MyPayments'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancel from './pages/PaymentCancel'
import Settings from './pages/Settings'
import Uniforms from './pages/Uniforms'
import UniformKitOrder from './pages/UniformKitOrder'
import Travel from './pages/Travel'
import TravelDetail from './pages/TravelDetail'
import Tryouts from './pages/Tryouts'
import TryoutDetail from './pages/TryoutDetail'
import Messages from './pages/Messages'
import AnnouncementDetail from './pages/AnnouncementDetail'
import { RoleSelection } from './pages/RoleSelection'

// Portal Pages - Lazy loaded
const CreateAthletePortal = lazy(() => import('./pages/CreateAthletePortal'))
const EditAthletePortal = lazy(() => import('./pages/EditAthletePortal'))

// Admin Layout (Material Dashboard)
import AdminLayout from './layouts/AdminLayout'

// Platform Admin Layout
const PlatformAdminLayout = lazy(() => import('./layouts/PlatformAdminLayout'))

// Platform Admin Pages - Lazy loaded for code splitting
const PlatformAdminDashboard = lazy(() => import('./pages/platformAdmin/PlatformAdminDashboard'))
const PlatformOrganizations = lazy(() => import('./pages/platformAdmin/Organizations'))
const PlatformOrganizationDetail = lazy(() => import('./pages/platformAdmin').then(m => ({ default: m.OrganizationDetail })))
const PlatformUsers = lazy(() => import('./pages/platformAdmin/Users'))
const PlatformUserDetail = lazy(() => import('./pages/platformAdmin/UserDetail'))
const PlatformStructure = lazy(() => import('./pages/platformAdmin/Structure'))
const PlatformPayments = lazy(() => import('./pages/platformAdmin/PlatformPayments'))
const PlatformFees = lazy(() => import('./pages/platformAdmin/Fees'))
const PlatformEventLog = lazy(() => import('./pages/platformAdmin/EventLog'))
const PlatformFeatureFlags = lazy(() => import('./pages/platformAdmin/FeatureFlags'))
const PlatformFeatureFlagDetail = lazy(() => import('./pages/platformAdmin/FeatureFlagDetail'))
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
const OrganizationStructureOverview = lazy(() => import('./pages/admin/OrganizationStructureNew'))
const Sports = lazy(() => import('./pages/admin/Sports'))
const SportDetail = lazy(() => import('./pages/admin/SportDetail'))
const Programs = lazy(() => import('./pages/admin/Programs'))
const ProgramDetail = lazy(() => import('./pages/admin/ProgramDetail'))
const LevelsManagement = lazy(() => import('./pages/admin/LevelsManagement'))
const TeamsManagement = lazy(() => import('./pages/admin/TeamsManagement'))
const SeasonsManagement = lazy(() => import('./pages/admin/SeasonsManagement'))
const SeasonDetail = lazy(() => import('./pages/admin/SeasonDetail'))
const Teams = lazy(() => import('./pages/admin/Teams'))
const TeamDetail = lazy(() => import('./pages/admin/TeamDetail'))
const Roster = lazy(() => import('./pages/admin/Roster'))
const Events = lazy(() => import('./pages/admin/Events'))
const CreateEvent = lazy(() => import('./pages/admin/CreateEvent'))
const EditEvent = lazy(() => import('./pages/admin/EditEvent'))
const AttendanceRoster = lazy(() => import('./pages/admin/AttendanceRoster'))
const AdminAttendance = lazy(() => import('./pages/admin/AdminAttendance'))
const Payments = lazy(() => import('./pages/admin/Payments'))
const CreateFee = lazy(() => import('./pages/admin/CreateFee'))
const UniformOrders = lazy(() => import('./pages/admin/UniformOrders'))
const CreateUniform = lazy(() => import('./pages/admin/CreateUniform'))
const EditUniform = lazy(() => import('./pages/admin/EditUniform'))
const TravelPlans = lazy(() => import('./pages/admin/TravelPlans'))
const CreateTravelPlan = lazy(() => import('./pages/admin/CreateTravelPlan'))
const EditTravelPlan = lazy(() => import('./pages/admin/EditTravelPlan'))
const AdminTryouts = lazy(() => import('./pages/admin/AdminTryouts'))
const AdminTryoutDetail = lazy(() => import('./pages/admin/AdminTryoutDetail'))
const CreateTryout = lazy(() => import('./pages/admin/CreateTryout'))
const OrganizationSettings = lazy(() => import('./pages/admin/OrganizationSettings'))
const OrganizationStructureForms = lazy(() => import('./pages/admin/OrganizationStructureForms'))
const OrganizationUsers = lazy(() => import('./pages/admin/OrganizationUsers'))
const OrganizationOnboarding = lazy(() => import('./pages/admin/OrganizationOnboarding'))
const OrganizationBilling = lazy(() => import('./pages/admin/OrganizationBilling'))
const PlanSelection = lazy(() => import('./pages/admin/PlanSelection'))
const CheckoutSuccess = lazy(() => import('./pages/admin/CheckoutSuccess'))
const CheckoutCancel = lazy(() => import('./pages/admin/CheckoutCancel'))
const TrialExpired = lazy(() => import('./pages/admin/TrialExpired'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminFamilies = lazy(() => import('./pages/admin/AdminFamilies'))
const CreateFamily = lazy(() => import('./pages/admin/CreateFamily'))
const FamilyDetail = lazy(() => import('./pages/admin/FamilyDetail'))
const CreateChild = lazy(() => import('./pages/admin/CreateChild'))
const CreateAthlete = lazy(() => import('./pages/admin/CreateAthlete'))
const EditAthlete = lazy(() => import('./pages/admin/EditAthlete'))
const AdminChildren = lazy(() => import('./pages/admin/AdminChildren'))
const ImportAthletes = lazy(() => import('./pages/admin/ImportAthletes'))

function HostHomeRoute() {
  const appContext = getHostAppContext()
  if (appContext === 'platform') return <Navigate to={getLink(RouteKeys.PORTAL_DASHBOARD)} replace />
  if (appContext === 'platform-admin') return <Navigate to={getLink(RouteKeys.PLATFORM_DASHBOARD)} replace />
  return <Marketing />
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
      getPath(RouteKeys.AUTH_LOGIN),
      getPath(RouteKeys.AUTH_SIGNUP),
      getPath(RouteKeys.AUTH_FORGOT_PASSWORD),
      getPath(RouteKeys.AUTH_RESET_PASSWORD),
      getLink('auth.authCallback'),
      getLink('auth.confirmEmail'),
      getPath(RouteKeys.AUTH_UNAUTHORIZED),
      getPath(RouteKeys.AUTH_ACCEPT_INVITE),
    ]

    if (allowlisted.some((p) => path.startsWith(p))) return <Outlet />
    return <Navigate to={getLink(RouteKeys.PLATFORM_DASHBOARD)} replace />
  }

  // Never allow org-admin UI on admin.* (platform admin host).
  if (isOrgAdmin) return <Navigate to={getLink(RouteKeys.PLATFORM_DASHBOARD)} replace />

  // Allow platform-admin routes.
  if (isPlatformAdmin) return <Outlet />

  return <Outlet />
}

function App() {
  return (
    <OrganizationProvider>
      <AuthProvider>
        <AppWithTheme />
      </AuthProvider>
    </OrganizationProvider>
  )
}

function AppWithTheme() {
  // Apply organization theme globally - must be inside both OrganizationProvider and AuthProvider
  useOrganizationTheme()

  // PlatformAdminRoute must be defined inside AppWithTheme to ensure it's within AuthProvider context
  function PlatformAdminRoute({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth()
    const location = useLocation()

    if (loading) return <AdminLoadingSpinner />
    if (!user) return <Navigate to={getLink(RouteKeys.AUTH_LOGIN)} state={{ from: location }} replace />
    if (!profile) return <AdminLoadingSpinner />
    if (!profile.isPlatformAdmin) return <Navigate to={getLink(RouteKeys.AUTH_UNAUTHORIZED)} replace />

    return <>{children}</>
  }

  return (
    <>
      <Toaster />
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
            <Route path="athletes" element={<ProtectedRoute><Athletes /></ProtectedRoute>} />
            <Route path="athletes/new" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><CreateAthletePortal /></Suspense></ProtectedRoute>} />
            <Route path="athletes/:id/edit" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><EditAthletePortal /></Suspense></ProtectedRoute>} />
            <Route path="join" element={<ProtectedRoute><JoinTeam /></ProtectedRoute>} />
            <Route path="calendar/events/:eventId" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
            <Route path="calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
            <Route path="payments" element={<ProtectedRoute><MyPayments /></ProtectedRoute>} />
            <Route path="payments/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
            <Route path="payments/cancel" element={<ProtectedRoute><PaymentCancel /></ProtectedRoute>} />
            <Route path="uniforms" element={<ProtectedRoute><Uniforms /></ProtectedRoute>} />
            <Route path="uniforms/:kitId" element={<ProtectedRoute><UniformKitOrder /></ProtectedRoute>} />
            <Route path="travel" element={<ProtectedRoute><Travel /></ProtectedRoute>} />
            <Route path="travel/:id" element={<ProtectedRoute><TravelDetail /></ProtectedRoute>} />
            <Route path="tryouts" element={<ProtectedRoute><Tryouts /></ProtectedRoute>} />
            <Route path="tryouts/:tryoutId" element={<ProtectedRoute><TryoutDetail /></ProtectedRoute>} />
            <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="messages/:announcementId" element={<ProtectedRoute><AnnouncementDetail /></ProtectedRoute>} />
            
            {/* Redirect root portal to dashboard */}
            <Route index element={<Navigate to={getLink(RouteKeys.PORTAL_DASHBOARD)} replace />} />

            {/* Catch-all to prevent blank/"blue" screens on unknown portal routes */}
            {/* Use replace: false to preserve browser history for back button navigation */}
            <Route path="*" element={<Navigate to={getLink(RouteKeys.PORTAL_DASHBOARD)} replace={false} />} />
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

          {/* Trial Expired - Standalone route outside AdminLayout */}
          <Route
            path="/admin/organization/trial-expired"
            element={
              <ProtectedRoute>
                <Suspense fallback={<AdminLoadingSpinner />}>
                  <TrialExpired />
                </Suspense>
              </ProtectedRoute>
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
                <ProtectedRoute allowedRoles={['admin', 'org_admin', 'coach']}>
                  <SidebarProvider>
                    <Suspense fallback={<AdminLoadingSpinner />}>
                      <AdminLayout />
                    </Suspense>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            >
              {/* Admin Dashboard */}
              <Route index element={<AdminDashboard />} />
            
              {/* Organizational Structure */}
              <Route path="organization/structure" element={<OrganizationStructureOverview />} />
              <Route path="organization/sports" element={<Sports />} />
              <Route path="organization/sports/:id" element={<SportDetail />} />
              <Route path="organization/programs" element={<Programs />} />
              <Route path="organization/programs/:id" element={<ProgramDetail />} />
              <Route path="organization/levels" element={<LevelsManagement />} />
              <Route path="organization/teams" element={<TeamsManagement />} />
              <Route path="organization/seasons" element={<SeasonsManagement />} />
              <Route path="organization/seasons/:id" element={<SeasonDetail />} />

              {/* Teams (legacy) */}
              <Route path="teams" element={<Teams />} />
              <Route path="teams/:id" element={<TeamDetail />} />
              <Route path="teams/:id/roster" element={<Roster />} />

              {/* Families */}
              <Route path="families" element={<AdminFamilies />} />
              <Route path="families/new" element={<CreateFamily />} />
              <Route path="families/:id" element={<FamilyDetail />} />
              <Route path="families/:familyId/athletes/new" element={<CreateChild />} />
              
              {/* Athletes */}
              <Route path="athletes" element={<AdminChildren />} />
              <Route path="athletes/new" element={<CreateAthlete />} />
              <Route path="athletes/:id/edit" element={<EditAthlete />} />
              <Route path="athletes/import" element={<ImportAthletes />} />
            
              {/* Events */}
            
              {/* Events */}
              <Route path="events" element={<Events />} />
              <Route path="events/new" element={<CreateEvent />} />
              <Route path="events/:id/edit" element={<EditEvent />} />
              <Route path="events/:id/attendance" element={<AttendanceRoster />} />

              {/* Attendance */}
              <Route path="attendance" element={<AdminAttendance />} />
            
              {/* Payments */}
              <Route path="payments" element={<Payments />} />
              <Route path="payments/new" element={<CreateFee />} />
            
              {/* Uniforms */}
              <Route path="uniforms" element={<UniformOrders />} />
              <Route path="uniforms/new" element={<CreateUniform />} />
              <Route path="uniforms/:id/edit" element={<EditUniform />} />
              <Route path="uniforms/:kitId" element={<UniformOrders />} />
            
              {/* Travel */}
              <Route path="travel" element={<TravelPlans />} />
              <Route path="travel/new" element={<CreateTravelPlan />} />
              <Route path="travel/:id" element={<EditTravelPlan />} />
            
              {/* Tryouts */}
              <Route path="tryouts" element={<AdminTryouts />} />
              <Route path="tryouts/new" element={<CreateTryout />} />
              <Route path="tryouts/:tryoutId" element={<AdminTryoutDetail />} />
            
              {/* Users */}
              <Route path="users/new" element={<CreateUser />} />
            
              {/* Organization */}
              <Route path="organization" element={<OrganizationSettings />} />
              <Route path="organization/forms" element={<OrganizationStructureForms />} />
              <Route path="organization/users" element={<OrganizationUsers />} />
              <Route path="organization/billing" element={<OrganizationBilling />} />
              <Route path="organization/billing/plan-selection" element={<PlanSelection />} />
              <Route path="organization/billing/checkout/success" element={<CheckoutSuccess />} />
              <Route path="organization/billing/checkout/cancel" element={<CheckoutCancel />} />
              
              {/* Personal Settings */}
              <Route path="settings" element={<AdminSettings />} />
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
                  <SidebarProvider>
                    <Suspense fallback={<AdminLoadingSpinner />}>
                      <PlatformAdminLayout />
                    </Suspense>
                  </SidebarProvider>
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
              <Route path="feature-flags/:id" element={<PlatformFeatureFlagDetail />} />
              
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
    </>
  )
}

export default App
