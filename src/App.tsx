import { Routes, Route, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { DemoSessionProvider } from './contexts/DemoSessionContext'
import { LoadingStateProvider } from './contexts/LoadingStateContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { FeatureGateRoute } from './components/FeatureGateRoute'
import { FeatureGateProvider } from './lib/featureGate'
import AdminLoadingSpinner from './components/admin/AdminLoadingSpinner'
import FullScreenLoader from './components/common/FullScreenLoader'
import { getHostAppContext } from './utils/host'
import { useOrganizationTheme } from './hooks/useOrganizationTheme'
import { getLink, getPath, RouteKeys } from './utils/routes'
import { I18nProvider } from './i18n/I18nProvider'
import { Toaster } from './components/Toaster'
import { ConditionalRouteLogger } from './lib/debug/integrations/RouteLogger'
import { DemoPageViewTracker } from './components/demo/DemoPageViewTracker'
import { USE_FAKE_DATA } from './data/config'

// Marketing Page
import Marketing from './pages/Marketing'

// Auth Pages
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AcceptInvite from './pages/AcceptInvite'
import JoinByLink from './pages/JoinByLink'
import AuthCallback from './pages/AuthCallback'
import ConfirmEmail from './pages/ConfirmEmail'
import CompleteProfile from './pages/CompleteProfile'
import Unauthorized from './pages/Unauthorized'
import DemoRequest from './pages/DemoRequest'
import DemoEntry from './pages/DemoEntry'
import DemoWelcome from './pages/DemoWelcome'

// Main Pages (keep unchanged - Tailwind CSS)
import Dashboard from './pages/Dashboard'
import Athletes from './pages/Athletes'
import JoinTeam from './pages/JoinTeam'
import Calendar from './pages/Calendar'
import EventDetail from './pages/EventDetail'
import MyPayments from './pages/MyPayments'
import PaymentDetail from './pages/PaymentDetail'
import AdminPaymentDetail from './pages/admin/PaymentDetail'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancel from './pages/PaymentCancel'
import Settings from './pages/Settings'
import Uniforms from './pages/Uniforms'
import UniformKitOrder from './pages/UniformKitOrder'
import Travel from './pages/Travel'
import TravelDetail from './pages/TravelDetail'
import Tryouts from './pages/Tryouts'
import TryoutDetail from './pages/TryoutDetail'
import Huddles from './pages/Huddles'
import AnnouncementDetail from './pages/AnnouncementDetail'
import { RoleSelection } from './pages/RoleSelection'
import AthleteProfile from './pages/AthleteProfile'
import Photos from './pages/Photos'
const Notifications = lazy(() => import('./pages/Notifications'))
const PhotosGallery = lazy(() => import('./pages/PhotosGallery'))

// Help Center Pages
const HelpHomepage = lazy(() => import('./pages/help/HelpHomepage'))
const CategoryLandingPage = lazy(() => import('./pages/help/CategoryLandingPage'))
const TopicPage = lazy(() => import('./pages/help/TopicPage'))
const ArticlePage = lazy(() => import('./pages/help/ArticlePage'))
const HelpContactPage = lazy(() => import('./pages/help/ContactPage'))

// Ticketing Pages
import TicketEventList from './pages/ticketing/TicketEventList'
import TicketEventDetail from './pages/ticketing/TicketEventDetail'
import TicketOrderSuccess from './pages/ticketing/TicketOrderSuccess'
import MyTickets from './pages/ticketing/MyTickets'
import TicketAccess from './pages/ticketing/TicketAccess'
import TicketAccessPage from './pages/ticketing/TicketAccessPage'
import TicketScanner from './pages/ticketing/TicketScanner'
import ResendTicketsPage from './pages/orders/ResendTicketsPage'
// Org-scoped public ticketing routes
import OrgScopedTicketEventList from './pages/ticketing/OrgScopedTicketEventList'
import OrgScopedTicketEventDetail from './pages/ticketing/OrgScopedTicketEventDetail'
import OrgScopedTicketOrderSuccess from './pages/ticketing/OrgScopedTicketOrderSuccess'
import OrgScopedTicketAccess from './pages/ticketing/OrgScopedTicketAccess'
import OrgLanding from './pages/ticketing/OrgLanding'
import SubOrgRegistration from './pages/SubOrgRegistration'

// Portal Pages - Lazy loaded
const CreateAthletePortal = lazy(() => import('./pages/CreateAthletePortal'))
const EditAthletePortal = lazy(() => import('./pages/EditAthletePortal'))
const RequestAthleteAttachment = lazy(() => import('./pages/RequestAthleteAttachment').then(m => ({ default: m.default })))
const PortalCreateEvent = lazy(() => import('./pages/portal/PortalCreateEvent'))
const PortalEditEvent = lazy(() => import('./pages/portal/PortalEditEvent'))
const FollowedOrgs = lazy(() => import('./pages/portal/FollowedOrgs'))
const BookmarkedEvents = lazy(() => import('./pages/portal/BookmarkedEvents'))
const PortalContactPage = lazy(() => import('./pages/portal/ContactPage'))

// Fan Pages - Lazy loaded
const FanHome = lazy(() => import('./pages/fan/FanHome'))
const FanFollowing = lazy(() => import('./pages/fan/FanFollowing'))
const FanOrgProfile = lazy(() => import('./pages/fan/FanOrgProfile'))
const FanPhotos = lazy(() => import('./pages/fan/FanPhotos'))
const FanGalleryDetail = lazy(() => import('./pages/fan/FanPhotos').then(m => ({ default: m.FanGalleryDetail })))
const FanAthletePhotos = lazy(() => import('./pages/fan/FanPhotos').then(m => ({ default: m.FanAthletePhotos })))
const FanVideos = lazy(() => import('./pages/fan/FanVideos'))
const FanVideoDetail = lazy(() => import('./pages/fan/FanVideoDetail'))
const FanSchedule = lazy(() => import('./pages/fan/FanSchedule'))
const FanEventDetail = lazy(() => import('./pages/fan/FanEventDetail'))
const FanTickets = lazy(() => import('./pages/fan/FanTickets'))
const FanTicketDetail = lazy(() => import('./pages/fan/FanTickets').then(m => ({ default: m.FanTicketDetail })))
const FanProfile = lazy(() => import('./pages/fan/FanProfile'))
const FanProfileEdit = lazy(() => import('./pages/fan/FanProfile').then(m => ({ default: m.FanProfileEdit })))
const FanProfileNotifications = lazy(() => import('./pages/fan/FanProfile').then(m => ({ default: m.FanProfileNotifications })))
const FanProfileLinkedAthletes = lazy(() => import('./pages/fan/FanProfile').then(m => ({ default: m.FanProfileLinkedAthletes })))
const FanProfilePrivacy = lazy(() => import('./pages/fan/FanProfile').then(m => ({ default: m.FanProfilePrivacy })))
const FanTeamProfile = lazy(() => import('./pages/fan/FanTeamProfile'))
const FanAthleteProfile = lazy(() => import('./pages/fan/FanAthleteProfile'))
const FanLayout = lazy(() => import('./components/fan/FanLayout'))


// Video Pages - Lazy loaded
const GuardianVideos = lazy(() => import('./pages/GuardianVideos'))
const GuardianVideoDetail = lazy(() => import('./pages/GuardianVideoDetail'))
const CoachVideoLibrary = lazy(() => import('./pages/CoachVideoLibrary'))
const CoachVideoDetail = lazy(() => import('./pages/CoachVideoDetail'))
const SharedVideoPage = lazy(() => import('./pages/SharedVideoPage'))

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
const PlatformAdminSettings = lazy(() => import('./pages/platformAdmin/PlatformAdminSettings'))
const ContactSubmissions = lazy(() => import('./pages/platformAdmin/ContactSubmissions'))
const HelpCenterSettings = lazy(() => import('./pages/platformAdmin/HelpCenterSettings'))
const HelpCenterRoleMappings = lazy(() => import('./pages/platformAdmin/HelpCenterRoleMappings'))
const HelpCenterCategoryPages = lazy(() => import('./pages/platformAdmin/HelpCenterCategoryPages'))
const HelpCenterSections = lazy(() => import('./pages/platformAdmin/HelpCenterSections'))
const HelpCenterThumbnails = lazy(() => import('./pages/platformAdmin/HelpCenterThumbnails'))
const PlatformDemoManagement = lazy(() => import('./pages/platformAdmin/DemoManagement'))
const PlatformDemoOrgDetail = lazy(() => import('./pages/platformAdmin/DemoOrgDetail'))
const PlatformDemoInsights = lazy(() => import('./pages/platformAdmin/DemoInsights'))
const LicensesOverview = lazy(() => import('./pages/platformAdmin/LicensesOverview'))
const LicenseTiers = lazy(() => import('./pages/platformAdmin/LicenseTiers'))
const LicenseTierDetail = lazy(() => import('./pages/platformAdmin/LicenseTierDetail'))
const FeatureCatalog = lazy(() => import('./pages/platformAdmin/FeatureCatalog'))
const FeatureDetail = lazy(() => import('./pages/platformAdmin/FeatureDetail'))
const Overrides = lazy(() => import('./pages/platformAdmin/Overrides'))
const OverrideCreate = lazy(() => import('./pages/platformAdmin/OverrideCreate'))
const OverrideDetail = lazy(() => import('./pages/platformAdmin/OverrideDetail'))
const LicensesAudit = lazy(() => import('./pages/platformAdmin/LicensesAudit'))

// Email Preview - Platform Admin Feature
const EmailPreview = lazy(() => import('./pages/platformAdmin/EmailPreview'))
const EmailTemplates = lazy(() => import('./pages/platformAdmin/EmailTemplates'))
const EmailTemplateEditor = lazy(() => import('./pages/platformAdmin/EmailTemplateEditor'))
// Photos - Platform Admin (overview, content review, storage, org galleries)
const PlatformPhotosOverview = lazy(() => import('./pages/platformAdmin/PhotosOverview'))
const PlatformPhotosContentReview = lazy(() => import('./pages/platformAdmin/PhotosContentReview'))
const PlatformPhotosStorage = lazy(() => import('./pages/platformAdmin/PhotosStorage'))
// Ticketing - Platform Admin
const PlatformTicketingAllEvents = lazy(() => import('./pages/platformAdmin/TicketingAllEvents'))
const PlatformTicketingOrderLookup = lazy(() => import('./pages/platformAdmin/TicketingOrderLookup'))
const PlatformTicketingWebhookStatus = lazy(() => import('./pages/platformAdmin/TicketingWebhookStatus'))
const PlatformTicketingOrgDashboard = lazy(() => import('./pages/platformAdmin/TicketingOrgDashboard'))

// Admin Pages - Lazy loaded for code splitting
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const CreateUser = lazy(() => import('./pages/admin/CreateUser'))
const EditUser = lazy(() => import('./pages/admin/EditUser'))
const OrganizationStructureOverview = lazy(() => import('./pages/admin/OrganizationStructureNew'))
const Sports = lazy(() => import('./pages/admin/Sports'))
const SportDetail = lazy(() => import('./pages/admin/SportDetail'))
// Reporting Pages
import ReportsOverview from './pages/admin/reporting/ReportsOverview'
import ReportBuilder from './pages/admin/reporting/ReportBuilder'
import SavedReports from './pages/admin/reporting/SavedReports'
import ExportHistory from './pages/admin/reporting/ExportHistory'
import ScheduledReports from './pages/admin/reporting/ScheduledReports'
import ReportViewer from './pages/admin/reporting/ReportViewer'
import ParticipationReport from './pages/admin/reporting/domain/ParticipationReport'
import PaymentsReport from './pages/admin/reporting/domain/PaymentsReport'
import SchedulingReport from './pages/admin/reporting/domain/SchedulingReport'
import TravelReport from './pages/admin/reporting/domain/TravelReport'
import UniformsReport from './pages/admin/reporting/domain/UniformsReport'
import CommunicationsReport from './pages/admin/reporting/domain/CommunicationsReport'
import OperationsReport from './pages/admin/reporting/domain/OperationsReport'
import TicketingReport from './pages/admin/reporting/TicketingReport'
import RegistrationReport from './pages/admin/reporting/RegistrationReport'
import VideoReport from './pages/admin/reporting/VideoReport'
import EventsReport from './pages/admin/reporting/EventsReport'
import ErrorsReport from './pages/admin/reporting/ErrorsReport'
const SportUpdate = lazy(() => import('./pages/admin/SportUpdate'))
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'))
const AdminNotificationAnalytics = lazy(() => import('./pages/admin/AdminNotificationAnalytics'))
const Programs = lazy(() => import('./pages/admin/Programs'))
const ProgramDetail = lazy(() => import('./pages/admin/ProgramDetail'))
const ProgramUpdate = lazy(() => import('./pages/admin/ProgramUpdate'))
const LevelsManagement = lazy(() => import('./pages/admin/LevelsManagement'))
const LevelDetail = lazy(() => import('./pages/admin/LevelDetail'))
const LevelUpdate = lazy(() => import('./pages/admin/LevelUpdate'))
const SeasonsManagement = lazy(() => import('./pages/admin/SeasonsManagement'))
const SeasonDetail = lazy(() => import('./pages/admin/SeasonDetail'))
const SeasonUpdate = lazy(() => import('./pages/admin/SeasonUpdate'))
const Teams = lazy(() => import('./pages/admin/Teams'))
const TeamDetail = lazy(() => import('./pages/admin/TeamDetail'))
const TeamUpdate = lazy(() => import('./pages/admin/TeamUpdate'))
const Roster = lazy(() => import('./pages/admin/Roster'))
const Events = lazy(() => import('./pages/admin/Events'))
const AdminEventDetail = lazy(() => import('./pages/admin/AdminEventDetail'))
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'))
const AdminAnnouncementDetail = lazy(() => import('./pages/admin/AdminAnnouncementDetail'))
const CreateEvent = lazy(() => import('./pages/admin/CreateEvent'))
const EditEvent = lazy(() => import('./pages/admin/EditEvent'))
const AttendanceRoster = lazy(() => import('./pages/admin/AttendanceRoster'))
const AdminAttendance = lazy(() => import('./pages/admin/AdminAttendance'))
const Payments = lazy(() => import('./pages/admin/Payments'))
const TicketingEvents = lazy(() => import('./pages/admin/TicketingEvents'))
const TicketingOrders = lazy(() => import('./pages/admin/TicketingOrders'))
const TicketingOrderDetail = lazy(() => import('./pages/admin/TicketingOrderDetail'))
const CreateTicketedEvent = lazy(() => import('./pages/admin/CreateTicketedEvent'))
const CreateTicketType = lazy(() => import('./pages/admin/CreateTicketType'))
const EditTicketType = lazy(() => import('./pages/admin/EditTicketType'))
const TicketingSeatMaps = lazy(() => import('./pages/admin/TicketingSeatMaps'))
const SeatMapBuilder = lazy(() => import('./pages/admin/ticketing/SeatMapBuilder'))
const CompTicketsPage = lazy(() => import('./pages/admin/CompTicketsPage'))
const ValidationDashboard = lazy(() => import('./pages/admin/ValidationDashboard'))
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
const AdminPhotosLayout = lazy(() => import('./pages/admin/photos/AdminPhotosLayout').then(m => ({ default: m.AdminPhotosLayout })))
const PhotosDashboardView = lazy(() => import('./pages/admin/photos/PhotosDashboardView').then(m => ({ default: m.PhotosDashboardView })))
const PhotosBrowseView = lazy(() => import('./pages/admin/photos/PhotosBrowseView').then(m => ({ default: m.PhotosBrowseView })))
const PhotosSearchView = lazy(() => import('./pages/admin/photos/PhotosSearchView').then(m => ({ default: m.PhotosSearchView })))
const PhotosBulkView = lazy(() => import('./pages/admin/photos/PhotosBulkView').then(m => ({ default: m.PhotosBulkView })))
const PhotosSettingsView = lazy(() => import('./pages/admin/photos/PhotosSettingsView').then(m => ({ default: m.PhotosSettingsView })))
const AdminPhotos = lazy(() => import('./pages/admin/Photos'))
void AdminPhotos
const AdminGalleryDetail = lazy(() => import('./pages/admin/GalleryDetail'))
const CreateGallery = lazy(() => import('./pages/admin/CreateGallery'))
const PhotoDetail = lazy(() => import('./pages/admin/PhotoDetail'))
const OrganizationSettings = lazy(() => import('./pages/admin/OrganizationSettings'))
const OrganizationStructureForms = lazy(() => import('./pages/admin/OrganizationStructureForms'))
const OrganizationUsers = lazy(() => import('./pages/admin/OrganizationUsers'))
const BulkInvitePage = lazy(() => import('./pages/admin/organization/BulkInvitePage'))
const OrganizationOnboarding = lazy(() => import('./pages/admin/OrganizationOnboarding'))
const OrganizationBilling = lazy(() => import('./pages/admin/OrganizationBilling'))
const SubOrganizations = lazy(() => import('./pages/admin/SubOrganizations'))
const PlanSelection = lazy(() => import('./pages/admin/PlanSelection'))
const CheckoutSuccess = lazy(() => import('./pages/admin/CheckoutSuccess'))
const CheckoutCancel = lazy(() => import('./pages/admin/CheckoutCancel'))
const TrialExpired = lazy(() => import('./pages/admin/TrialExpired'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminContactPage = lazy(() => import('./pages/admin/ContactPage'))

const adminEventsListPath = getPath('admin.events.list').replace('/admin/', '')
const adminEventsCreatePath = getPath('admin.events.create').replace('/admin/', '')
const adminEventsDetailPath = getPath('admin.events.detail').replace('/admin/', '')
const adminEventsEditPath = getPath('admin.events.edit').replace('/admin/', '')
const adminEventsAttendancePath = getPath('admin.events.attendance').replace('/admin/', '')
const adminFacilitiesListPath = getPath('admin.facilities.list').replace('/admin/', '')
const adminFacilityDetailPath = getPath('admin.facilities.detail').replace('/admin/', '')
const adminFacilitiesSchedulePath = getPath('admin.facilities.schedule').replace('/admin/', '')
const platformDemoManagementPath = getPath('platformAdmin.demoManagement.list').replace('/platform-admin/', '')
const platformDemoManagementDetailPath = getPath('platformAdmin.demoManagement.detail').replace('/platform-admin/', '')
const platformDemoInsightsPath = getPath('platformAdmin.demoInsights').replace('/platform-admin/', '')
const AdminFamilies = lazy(() => import('./pages/admin/AdminFamilies'))
const CreateFamily = lazy(() => import('./pages/admin/CreateFamily'))
const FamilyDetail = lazy(() => import('./pages/admin/FamilyDetail'))
const CreateChild = lazy(() => import('./pages/admin/CreateChild'))
const CreateAthlete = lazy(() => import('./pages/admin/CreateAthlete'))
const AthleteDetail = lazy(() => import('./pages/admin/AthleteDetail'))
const EditAthlete = lazy(() => import('./pages/admin/EditAthlete'))
const AdminAthletes = lazy(() => import('./pages/admin/AdminAthletes'))
const ImportAthletes = lazy(() => import('./pages/admin/ImportAthletes'))
const GuardianAttachmentRequests = lazy(() => import('./pages/admin/GuardianAttachmentRequests').then(m => ({ default: m.default })))
const Invitations = lazy(() => import('./pages/admin/Invitations'))
const AdminSportSettings = lazy(() => import('./pages/admin/AdminSportSettings'))
const Facilities = lazy(() => import('./pages/admin/Facilities'))
const FacilityDetail = lazy(() => import('./pages/admin/FacilityDetail'))
const FacilitiesSchedule = lazy(() => import('./pages/admin/FacilitiesSchedule'))

function HostHomeRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const appContext = getHostAppContext()

  // If Supabase redirected here with auth tokens in the hash (e.g. magic link used Site URL),
  // send the user to the auth callback so the session is established and they get the right redirect.
  const hash = location.hash || ''
  if (hash.includes('access_token')) {
    // Check if this is a demo callback - magic links from demo entry will have type=magiclink
    // Also check sessionStorage for demo entry flag
    const isDemoCallback = hash.includes('type=magiclink') || 
                          sessionStorage.getItem('demo_entry_initiated') === 'true' ||
                          USE_FAKE_DATA
    const search = isDemoCallback ? '?demo=true' : (location.search || '')
    // Clear the demo entry flag if it was set
    if (sessionStorage.getItem('demo_entry_initiated') === 'true') {
      sessionStorage.removeItem('demo_entry_initiated')
    }
    navigate({ pathname: '/portal/auth/callback', search: search || undefined, hash }, { replace: true })
    return <FullScreenLoader message="Completing sign in..." />
  }

  // Show demo entry page when USE_FAKE_DATA is true (demo environment)
  if (USE_FAKE_DATA) return <DemoEntry />
  if (appContext === 'platform') return <Navigate to={getLink(RouteKeys.PORTAL_DASHBOARD)} replace />
  if (appContext === 'platform-admin') return <Navigate to={getLink(RouteKeys.PLATFORM_DASHBOARD)} replace />
  return <Marketing />
}

// Redirect component that preserves route parameters
function RedirectWithParams({ to, paramKey = 'id', suffix = '' }: { to: string; paramKey?: string; suffix?: string }) {
  const params = useParams()
  const paramValue = params[paramKey]
  const redirectTo = paramValue ? `${to}/${paramValue}${suffix}` : to
  return <Navigate to={redirectTo} replace />
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
    <I18nProvider>
      <OrganizationProvider>
        <DemoSessionProvider>
          <AuthProvider>
            <LoadingStateProvider>
              <FeatureGateProvider>
                <AppWithTheme />
              </FeatureGateProvider>
            </LoadingStateProvider>
          </AuthProvider>
        </DemoSessionProvider>
      </OrganizationProvider>
    </I18nProvider>
  )
}

function AppWithTheme() {
  // Apply organization theme globally - must be inside both OrganizationProvider and AuthProvider
  useOrganizationTheme()

  // PlatformAdminRoute must be defined inside AppWithTheme to ensure it's within AuthProvider context
  function PlatformAdminRoute({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth()
    const location = useLocation()
    const hasIdentity = !!user && !!profile

    if (loading && !hasIdentity) return <AdminLoadingSpinner />
    if (!user) return <Navigate to={getLink(RouteKeys.AUTH_LOGIN)} state={{ from: location }} replace />
    if (!profile) return <AdminLoadingSpinner />
    if (!profile.isPlatformAdmin) return <Navigate to={getLink(RouteKeys.AUTH_UNAUTHORIZED)} replace />

    return <>{children}</>
  }

  return (
    <>
      <Toaster />
      <FullScreenLoader />
      <ConditionalRouteLogger />
      <DemoPageViewTracker />
      <Routes>
          {/* Marketing Landing Page - Public */}
          <Route path="/" element={<HostHomeRoute />} />
          
          {/* Org-Scoped Public Routes */}
          <Route path="/o/:orgSlug" element={<OrgLanding />} />
          <Route path="/o/:orgSlug/register-sub-org" element={<SubOrgRegistration />} />
          <Route path="/o/:orgSlug/tickets" element={<OrgScopedTicketEventList />} />
          <Route path="/o/:orgSlug/tickets/events/:eventId" element={<OrgScopedTicketEventDetail />} />
          <Route path="/o/:orgSlug/tickets/order/:orderId" element={<OrgScopedTicketOrderSuccess />} />
          <Route path="/o/:orgSlug/tickets/access" element={<TicketAccessPage />} />
          <Route path="/o/:orgSlug/tickets/access/:token" element={<OrgScopedTicketAccess />} />
          
          {/* Public Ticketing Routes */}
          <Route path="/portal/tickets" element={<TicketEventList />} />
          <Route path="/portal/tickets/events/:eventId" element={<TicketEventDetail />} />
          <Route path="/portal/tickets/order/:orderId" element={<TicketOrderSuccess />} />
          <Route path="/portal/tickets/access" element={<TicketAccessPage />} />
          <Route path="/portal/tickets/access/:token" element={<TicketAccess />} />
          <Route path="/portal/tickets/resend" element={<ResendTicketsPage />} />
          <Route path="/portal/tickets/validate/:token" element={<TicketScanner />} />
          
          {/* Public Shared Video Routes */}
          <Route path="/share/video/:token" element={
            <Suspense fallback={<FullScreenLoader />}>
              <SharedVideoPage />
            </Suspense>
          } />
          
          {/* Redirect /accept-invite to /portal/accept-invite for old email links */}
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* Public Demo Request Route */}
          <Route path="/demo-request" element={<DemoRequest />} />
          {/* Public Demo Entry Route */}
          <Route path="/demo" element={<DemoEntry />} />
          {/* Demo Welcome Route */}
          <Route path="/demo/welcome" element={<DemoWelcome />} />

          {/* Portal Routes - Guardians Only */}
          <Route path="/portal" element={<HostGateLayout />}>
            {/* Public Auth Routes */}
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="accept-invite" element={<AcceptInvite />} />
            <Route path="join/link" element={<JoinByLink />} />
            <Route path="auth/callback" element={<AuthCallback />} />
            <Route path="confirm-email" element={<ConfirmEmail />} />
            <Route path="unauthorized" element={<Unauthorized />} />

            {/* Protected Portal Routes - Guardians and Athletes */}
            <Route path="role-selection" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><RoleSelection /></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><Dashboard /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><Settings /></ProtectedRoute>} />
            <Route path="athletes" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><Athletes /></ProtectedRoute>} />
            <Route path="athletes/new" element={<ProtectedRoute allowedRoles={['parent']}><Suspense fallback={<AdminLoadingSpinner />}><CreateAthletePortal /></Suspense></ProtectedRoute>} />
            <Route path="athletes/:id/profile" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><AthleteProfile /></ProtectedRoute>} />
            <Route path="athletes/:id/edit" element={<ProtectedRoute allowedRoles={['parent']}><Suspense fallback={<AdminLoadingSpinner />}><EditAthletePortal /></Suspense></ProtectedRoute>} />
            <Route path="athletes/request-attachment" element={<ProtectedRoute allowedRoles={['parent']}><Suspense fallback={<AdminLoadingSpinner />}><RequestAthleteAttachment /></Suspense></ProtectedRoute>} />
            {/* Join route is public - handles auth internally */}
            <Route path="join" element={<JoinTeam />} />
            <Route path="complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
            <Route path="calendar/new" element={<ProtectedRoute allowedRoles={['parent']}><Suspense fallback={<AdminLoadingSpinner />}><PortalCreateEvent /></Suspense></ProtectedRoute>} />
            <Route path="calendar/events/:eventId/edit" element={<ProtectedRoute allowedRoles={['parent']}><Suspense fallback={<AdminLoadingSpinner />}><PortalEditEvent /></Suspense></ProtectedRoute>} />
            <Route path="calendar/events/:eventId" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><EventDetail /></ProtectedRoute>} />
            <Route path="calendar" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><Calendar /></ProtectedRoute>} />
            <Route path="payments" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.payments"><MyPayments /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="payments/:id" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.payments.detail"><PaymentDetail /></FeatureGateRoute></ProtectedRoute>} />
            <Route
              path="payments/success"
              element={
                USE_FAKE_DATA
                  ? <PaymentSuccess />
                  : <ProtectedRoute allowedRoles={['parent', 'athlete']}><PaymentSuccess /></ProtectedRoute>
              }
            />
            <Route
              path="payments/cancel"
              element={
                USE_FAKE_DATA
                  ? <PaymentCancel />
                  : <ProtectedRoute allowedRoles={['parent', 'athlete']}><PaymentCancel /></ProtectedRoute>
              }
            />
            <Route path="uniforms" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.uniforms"><Uniforms /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="uniforms/:kitId" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.uniforms.detail"><UniformKitOrder /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="travel" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.travel"><Travel /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="travel/:id" element={<ProtectedRoute allowedRoles={['parent', 'athlete', 'org_admin']}><FeatureGateRoute routeKey="portal.travel.detail"><TravelDetail /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="tryouts" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.tryouts"><Tryouts /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="tryouts/:tryoutId" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.tryouts.detail"><TryoutDetail /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="messages" element={<Navigate to="/portal/huddles/announcements" replace />} />
            <Route path="messages/:announcementId" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.messages"><AnnouncementDetail /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="huddles" element={<Navigate to="/portal/huddles/announcements" replace />} />
            <Route path="huddles/announcements" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.messages"><Huddles /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="huddles/chat" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.messages"><Huddles /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="photos" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.photos"><Photos /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="photos/gallery/:id" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.photosGallery"><Suspense fallback={<AdminLoadingSpinner />}><PhotosGallery /></Suspense></FeatureGateRoute></ProtectedRoute>} />
            <Route path="photos/gallery/:id/manage" element={<ProtectedRoute allowedRoles={['parent']}><FeatureGateRoute routeKey="portal.photosGalleryManage"><Suspense fallback={<AdminLoadingSpinner />}><PhotosGallery /></Suspense></FeatureGateRoute></ProtectedRoute>} />

            {/* Videos */}
            <Route path="videos" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><Suspense fallback={<AdminLoadingSpinner />}><GuardianVideos /></Suspense></ProtectedRoute>} />
            <Route path="videos/:id" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><Suspense fallback={<AdminLoadingSpinner />}><GuardianVideoDetail /></Suspense></ProtectedRoute>} />

            <Route path="account/tickets" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.myTickets"><MyTickets /></FeatureGateRoute></ProtectedRoute>} />
            <Route path="follows" element={<ProtectedRoute allowedRoles={['parent']}><Suspense fallback={<AdminLoadingSpinner />}><FollowedOrgs /></Suspense></ProtectedRoute>} />
            <Route path="bookmarks" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><Suspense fallback={<AdminLoadingSpinner />}><BookmarkedEvents /></Suspense></ProtectedRoute>} />

            {/* Redirect root portal to dashboard */}
            <Route path="notifications" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><FeatureGateRoute routeKey="portal.messages"><Suspense fallback={<AdminLoadingSpinner />}><Notifications /></Suspense></FeatureGateRoute></ProtectedRoute>} />
            <Route path="contact" element={<ProtectedRoute allowedRoles={['parent', 'athlete']}><Suspense fallback={<AdminLoadingSpinner />}><PortalContactPage /></Suspense></ProtectedRoute>} />
            <Route index element={<Navigate to={getLink(RouteKeys.PORTAL_DASHBOARD)} replace />} />

            {/* Catch-all to prevent blank/"blue" screens on unknown portal routes */}
            {/* Use replace: false to preserve browser history for back button navigation */}
            <Route path="*" element={<Navigate to={getLink(RouteKeys.PORTAL_DASHBOARD)} replace={false} />} />
          </Route>

          {/* Help Center Routes - Accessible to all authenticated users */}
          <Route path="/help" element={<ProtectedRoute><HelpHomepage /></ProtectedRoute>} />
          <Route path="/help/contact" element={<ProtectedRoute><Suspense fallback={<FullScreenLoader />}><HelpContactPage /></Suspense></ProtectedRoute>} />
          <Route path="/help/:parentCategorySlug/:categorySlug/:articleSlug" element={<ProtectedRoute><ArticlePage /></ProtectedRoute>} />
          <Route path="/help/:roleSlug/:topicSlug" element={<ProtectedRoute><Suspense fallback={<FullScreenLoader />}><TopicPage /></Suspense></ProtectedRoute>} />
          <Route path="/help/:categorySlug" element={<ProtectedRoute><CategoryLandingPage /></ProtectedRoute>} />
          <Route path="/help/:categorySlug/:articleSlug" element={<ProtectedRoute><ArticlePage /></ProtectedRoute>} />

          {/* Fan Routes - Public fan experience */}
          <Route path="/fan" element={<Suspense fallback={<AdminLoadingSpinner />}><FanLayout /></Suspense>}>
            {/* Public routes - accessible without auth for browsing */}
            <Route path="org/:slug" element={<Suspense fallback={<AdminLoadingSpinner />}><FanOrgProfile /></Suspense>} />
            <Route path="team/:id" element={<Suspense fallback={<AdminLoadingSpinner />}><FanTeamProfile /></Suspense>} />
            <Route path="athlete/:id" element={<Suspense fallback={<AdminLoadingSpinner />}><FanAthleteProfile /></Suspense>} />
            <Route path="events/:eventId" element={<Suspense fallback={<AdminLoadingSpinner />}><FanEventDetail /></Suspense>} />
            
            {/* Protected fan routes - require authentication */}
            <Route index element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanHome /></Suspense></ProtectedRoute>} />
            <Route path="home" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanHome /></Suspense></ProtectedRoute>} />
            <Route path="schedule" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanSchedule /></Suspense></ProtectedRoute>} />
            <Route path="photos" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanPhotos /></Suspense></ProtectedRoute>} />
            <Route path="photos/gallery/:id" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanGalleryDetail /></Suspense></ProtectedRoute>} />
            <Route path="photos/athlete/:athleteId" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanAthletePhotos /></Suspense></ProtectedRoute>} />
            <Route path="videos" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanVideos /></Suspense></ProtectedRoute>} />
            <Route path="videos/:id" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanVideoDetail /></Suspense></ProtectedRoute>} />
            <Route path="tickets" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanTickets /></Suspense></ProtectedRoute>} />
            <Route path="tickets/:ticketId" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanTicketDetail /></Suspense></ProtectedRoute>} />
            <Route path="following" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanFollowing /></Suspense></ProtectedRoute>} />
            <Route path="discover" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanFollowing /></Suspense></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanProfile /></Suspense></ProtectedRoute>} />
            <Route path="profile/edit" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanProfileEdit /></Suspense></ProtectedRoute>} />
            <Route path="profile/notifications" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanProfileNotifications /></Suspense></ProtectedRoute>} />
            <Route path="profile/linked-athletes" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanProfileLinkedAthletes /></Suspense></ProtectedRoute>} />
            <Route path="profile/privacy" element={<ProtectedRoute><Suspense fallback={<AdminLoadingSpinner />}><FanProfilePrivacy /></Suspense></ProtectedRoute>} />
            
            {/* Catch-all for unknown fan routes */}
            <Route path="*" element={<Navigate to="/fan" replace={false} />} />
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
            
              {/* Standardized Entity Routes - Most specific first */}
              <Route path="sports/:sport_slug/update" element={<FeatureGateRoute routeKey="admin.sports.update"><SportUpdate /></FeatureGateRoute>} />
              <Route path="sports/:sport_slug" element={<FeatureGateRoute routeKey="admin.sports.detail"><SportDetail /></FeatureGateRoute>} />
              <Route path="sports" element={<FeatureGateRoute routeKey="admin.sports.list"><Sports /></FeatureGateRoute>} />
              <Route path="programs/sport/:sport_slug" element={<FeatureGateRoute routeKey="admin.programs.bySport"><Programs /></FeatureGateRoute>} />
              <Route path="programs/:id/update" element={<FeatureGateRoute routeKey="admin.programs.update"><ProgramUpdate /></FeatureGateRoute>} />
              <Route path="programs/:id" element={<FeatureGateRoute routeKey="admin.programs.detail"><ProgramDetail /></FeatureGateRoute>} />
              <Route path="programs" element={<FeatureGateRoute routeKey="admin.programs.list"><Programs /></FeatureGateRoute>} />
              <Route path="levels/:id/update" element={<FeatureGateRoute routeKey="admin.levels.update"><LevelUpdate /></FeatureGateRoute>} />
              <Route path="levels/:id" element={<FeatureGateRoute routeKey="admin.levels.detail"><LevelDetail /></FeatureGateRoute>} />
              <Route path="levels" element={<FeatureGateRoute routeKey="admin.levels.list"><LevelsManagement /></FeatureGateRoute>} />
              <Route path="seasons/:id/update" element={<FeatureGateRoute routeKey="admin.seasons.update"><SeasonUpdate /></FeatureGateRoute>} />
              <Route path="seasons/:id" element={<FeatureGateRoute routeKey="admin.seasons.detail"><SeasonDetail /></FeatureGateRoute>} />
              <Route path="seasons" element={<FeatureGateRoute routeKey="admin.seasons.list"><SeasonsManagement /></FeatureGateRoute>} />
              <Route path="teams/:id/roster" element={<FeatureGateRoute routeKey="admin.teams.roster"><Roster /></FeatureGateRoute>} />
              <Route path="teams/:id/update" element={<FeatureGateRoute routeKey="admin.teams.update"><TeamUpdate /></FeatureGateRoute>} />
              <Route path="teams/:id" element={<FeatureGateRoute routeKey="admin.teams.detail"><TeamDetail /></FeatureGateRoute>} />
              <Route path="teams" element={<FeatureGateRoute routeKey="admin.teams.list"><Teams /></FeatureGateRoute>} />
              <Route path="athletes/:id/edit" element={<FeatureGateRoute routeKey="admin.athletes.edit"><EditAthlete /></FeatureGateRoute>} />
              <Route path="athletes/:id" element={<FeatureGateRoute routeKey="admin.athletes.detail"><AthleteDetail /></FeatureGateRoute>} />
              <Route path="athletes/new" element={<FeatureGateRoute routeKey="admin.athletes.create"><CreateAthlete /></FeatureGateRoute>} />
              <Route path="athletes/import" element={<FeatureGateRoute routeKey="admin.athletes.import"><ImportAthletes /></FeatureGateRoute>} />
              <Route path="athletes" element={<FeatureGateRoute routeKey="admin.athletes.list"><AdminAthletes /></FeatureGateRoute>} />
              <Route path="guardians/:familyId/athletes/new" element={<FeatureGateRoute routeKey="admin.athletes.create"><CreateChild /></FeatureGateRoute>} />
              <Route path="guardians/new" element={<FeatureGateRoute routeKey="admin.guardians.list"><CreateFamily /></FeatureGateRoute>} />
              <Route path="guardians/:id" element={<FeatureGateRoute routeKey="admin.guardians.detail"><FamilyDetail /></FeatureGateRoute>} />
              <Route path="guardians" element={<FeatureGateRoute routeKey="admin.guardians.list"><AdminFamilies /></FeatureGateRoute>} />
              <Route path="guardian-requests" element={<FeatureGateRoute routeKey="admin.guardianRequests"><GuardianAttachmentRequests /></FeatureGateRoute>} />
              <Route path="invitations" element={<FeatureGateRoute routeKey="admin.invitations"><Invitations /></FeatureGateRoute>} />

              {/* Backward Compatibility Redirects */}
              <Route path="organization/sports/:id" element={<RedirectWithParams to="/admin/sports" />} />
              <Route path="organization/sports" element={<Navigate to="/admin/sports" replace />} />
              <Route path="organization/programs/:id" element={<RedirectWithParams to="/admin/programs" />} />
              <Route path="organization/programs" element={<Navigate to="/admin/programs" replace />} />
              <Route path="organization/levels/:id" element={<RedirectWithParams to="/admin/levels" />} />
              <Route path="organization/levels" element={<Navigate to="/admin/levels" replace />} />
              <Route path="organization/seasons/:id" element={<RedirectWithParams to="/admin/seasons" />} />
              <Route path="organization/seasons" element={<Navigate to="/admin/seasons" replace />} />
              <Route path="organization/teams" element={<Navigate to="/admin/teams" replace />} />
              <Route path="users" element={<Navigate to="/admin/organization/users" replace />} />
              <Route path="scanner" element={<Navigate to="/admin/ticketing/scanner" replace />} />
              <Route path="staff" element={<Navigate to="/admin/organization?tab=staff" replace />} />
              <Route path="events/create" element={<Navigate to={getLink(RouteKeys.ADMIN_CREATE_EVENT)} replace />} />
              <Route path="athletes/:id/edit" element={<RedirectWithParams to="/admin/athletes" />} />
              <Route path="families/:familyId/athletes/new" element={<RedirectWithParams to="/admin/guardians" paramKey="familyId" suffix="/athletes/new" />} />
              <Route path="families/new" element={<Navigate to="/admin/guardians/new" replace />} />
              <Route path="families/:id" element={<RedirectWithParams to="/admin/guardians" />} />
              <Route path="families" element={<Navigate to="/admin/guardians" replace />} />

              {/* Organizational Structure */}
              <Route path="organization/overview" element={<OrganizationStructureOverview />} />

            
              {/* Events */}
            
              {/* Events */}
              <Route path={adminEventsListPath} element={<FeatureGateRoute routeKey="admin.events.list"><Events /></FeatureGateRoute>} />
              <Route path={adminEventsCreatePath} element={<FeatureGateRoute routeKey="admin.events.create"><CreateEvent /></FeatureGateRoute>} />
              <Route path={adminEventsEditPath} element={<FeatureGateRoute routeKey="admin.events.edit"><EditEvent /></FeatureGateRoute>} />
              <Route path={adminEventsAttendancePath} element={<FeatureGateRoute routeKey="admin.attendance"><AttendanceRoster /></FeatureGateRoute>} />
              <Route path={adminEventsDetailPath} element={<FeatureGateRoute routeKey="admin.events.detail"><AdminEventDetail /></FeatureGateRoute>} />

              {/* Facilities */}
              <Route path={adminFacilitiesListPath} element={<FeatureGateRoute routeKey="admin.facilities.list"><Facilities /></FeatureGateRoute>} />
              <Route path={adminFacilityDetailPath} element={<FeatureGateRoute routeKey="admin.facilities.detail"><FacilityDetail /></FeatureGateRoute>} />
              <Route path={adminFacilitiesSchedulePath} element={<FeatureGateRoute routeKey="admin.facilities.schedule"><FacilitiesSchedule /></FeatureGateRoute>} />

              {/* Announcements */}
              <Route path="announcements" element={<FeatureGateRoute routeKey="admin.announcements.list"><AdminAnnouncements /></FeatureGateRoute>} />
              <Route path="announcements/:announcementId" element={<FeatureGateRoute routeKey="admin.announcements.detail"><AdminAnnouncementDetail /></FeatureGateRoute>} />

              {/* Attendance */}
              <Route path="attendance" element={<FeatureGateRoute routeKey="admin.attendance"><AdminAttendance /></FeatureGateRoute>} />
            
              {/* Payments */}
              <Route path="payments" element={<FeatureGateRoute routeKey="admin.payments.list"><Payments /></FeatureGateRoute>} />

              {/* Reporting */}
              <Route path="reports" element={<FeatureGateRoute routeKey="admin.reports.overview"><ReportsOverview /></FeatureGateRoute>} />
              <Route path="reports/builder" element={<FeatureGateRoute routeKey="admin.reports.builder"><ReportBuilder /></FeatureGateRoute>} />
              <Route path="reports/saved" element={<FeatureGateRoute routeKey="admin.reports.saved"><SavedReports /></FeatureGateRoute>} />
              <Route path="reports/exports" element={<FeatureGateRoute routeKey="admin.reports.exports"><ExportHistory /></FeatureGateRoute>} />
              <Route path="reports/schedules" element={<FeatureGateRoute routeKey="admin.reports.schedules"><ScheduledReports /></FeatureGateRoute>} />
              <Route path="reports/ticketing" element={<FeatureGateRoute routeKey="admin.reports.overview"><TicketingReport /></FeatureGateRoute>} />
              <Route path="reports/registration" element={<FeatureGateRoute routeKey="admin.reports.overview"><RegistrationReport /></FeatureGateRoute>} />
              <Route path="reports/video" element={<FeatureGateRoute routeKey="admin.reports.overview"><VideoReport /></FeatureGateRoute>} />
              <Route path="reports/events" element={<FeatureGateRoute routeKey="admin.reports.overview"><EventsReport /></FeatureGateRoute>} />
              <Route path="reports/errors" element={<FeatureGateRoute routeKey="admin.reports.overview"><ErrorsReport /></FeatureGateRoute>} />
              <Route path="reports/domain/participation" element={<FeatureGateRoute routeKey="admin.reports.overview"><ParticipationReport /></FeatureGateRoute>} />
              <Route path="reports/domain/payments" element={<FeatureGateRoute routeKey="admin.reports.overview"><PaymentsReport /></FeatureGateRoute>} />
              <Route path="reports/domain/scheduling" element={<FeatureGateRoute routeKey="admin.reports.overview"><SchedulingReport /></FeatureGateRoute>} />
              <Route path="reports/domain/travel" element={<FeatureGateRoute routeKey="admin.reports.overview"><TravelReport /></FeatureGateRoute>} />
              <Route path="reports/domain/uniforms" element={<FeatureGateRoute routeKey="admin.reports.overview"><UniformsReport /></FeatureGateRoute>} />
              <Route path="reports/domain/communications" element={<FeatureGateRoute routeKey="admin.reports.overview"><CommunicationsReport /></FeatureGateRoute>} />
              <Route path="reports/domain/operations" element={<FeatureGateRoute routeKey="admin.reports.overview"><OperationsReport /></FeatureGateRoute>} />
              <Route path="reports/:reportId" element={<FeatureGateRoute routeKey="admin.reports.viewer"><ReportViewer /></FeatureGateRoute>} />
              <Route path="payments/:id" element={<FeatureGateRoute routeKey="admin.payments.detail"><AdminPaymentDetail /></FeatureGateRoute>} />
              <Route path="payments/new" element={<FeatureGateRoute routeKey="admin.payments.fees.create"><CreateFee /></FeatureGateRoute>} />
            
              {/* Ticketing */}
              <Route path="ticketing/scanner/:eventId" element={<FeatureGateRoute routeKey="admin.ticketingScanner"><TicketScanner /></FeatureGateRoute>} />
              <Route path="ticketing/scanner" element={<FeatureGateRoute routeKey="admin.ticketingScanner"><TicketScanner /></FeatureGateRoute>} />
              <Route path="ticketing/events" element={<FeatureGateRoute routeKey="admin.ticketingEvents.list"><Suspense fallback={<AdminLoadingSpinner />}><TicketingEvents /></Suspense></FeatureGateRoute>} />
              <Route path="ticketing/seat-maps" element={<FeatureGateRoute routeKey="admin.ticketingEvents.seatMaps.list"><Suspense fallback={<AdminLoadingSpinner />}><TicketingSeatMaps /></Suspense></FeatureGateRoute>} />
              <Route path="ticketing/seat-maps/:seatMapId/edit" element={<FeatureGateRoute routeKey="admin.ticketingEvents.seatMaps.edit"><Suspense fallback={<AdminLoadingSpinner />}><SeatMapBuilder /></Suspense></FeatureGateRoute>} />
              <Route path="ticketing/events/new" element={<FeatureGateRoute routeKey="admin.ticketingEvents.create"><Suspense fallback={<AdminLoadingSpinner />}><CreateTicketedEvent /></Suspense></FeatureGateRoute>} />
              <Route path="ticketing/events/:id/ticket-types/new" element={<FeatureGateRoute routeKey="admin.ticketingEvents.ticketTypes.create"><Suspense fallback={<AdminLoadingSpinner />}><CreateTicketType /></Suspense></FeatureGateRoute>} />
              <Route path="ticketing/events/:id/ticket-types/edit" element={<FeatureGateRoute routeKey="admin.ticketingEvents.ticketTypes.edit"><Suspense fallback={<AdminLoadingSpinner />}><EditTicketType /></Suspense></FeatureGateRoute>} />
              <Route path="ticketing/events/:eventId/seat-maps/:seatMapId" element={<FeatureGateRoute routeKey="admin.ticketingEvents.seatMaps.builder"><Suspense fallback={<AdminLoadingSpinner />}><SeatMapBuilder /></Suspense></FeatureGateRoute>} />
              <Route path="ticketing/events/:id/dashboard" element={<FeatureGateRoute routeKey="admin.ticketingEvents.list"><Suspense fallback={<AdminLoadingSpinner />}><ValidationDashboard /></Suspense></FeatureGateRoute>} />
              <Route path="ticketing/comp-tickets" element={<FeatureGateRoute routeKey="admin.ticketingEvents.create"><Suspense fallback={<AdminLoadingSpinner />}><CompTicketsPage /></Suspense></FeatureGateRoute>} />
              <Route path="ticketing/orders" element={<FeatureGateRoute routeKey="admin.ticketingOrders"><Suspense fallback={<AdminLoadingSpinner />}><TicketingOrders /></Suspense></FeatureGateRoute>} />
              <Route path="ticketing/orders/:orderId" element={<FeatureGateRoute routeKey="admin.ticketingOrders"><Suspense fallback={<AdminLoadingSpinner />}><TicketingOrderDetail /></Suspense></FeatureGateRoute>} />
            
              {/* Uniforms */}
              <Route path="uniforms" element={<FeatureGateRoute routeKey="admin.uniforms.list"><UniformOrders /></FeatureGateRoute>} />
              <Route path="uniforms/new" element={<FeatureGateRoute routeKey="admin.uniforms.create"><CreateUniform /></FeatureGateRoute>} />
              <Route path="uniforms/:id/edit" element={<FeatureGateRoute routeKey="admin.uniforms.edit"><EditUniform /></FeatureGateRoute>} />
              <Route path="uniforms/:kitId" element={<FeatureGateRoute routeKey="admin.uniforms.detail"><UniformOrders /></FeatureGateRoute>} />
            
              {/* Travel */}
              <Route path="travel" element={<FeatureGateRoute routeKey="admin.travel.list"><TravelPlans /></FeatureGateRoute>} />
              <Route path="travel/new" element={<FeatureGateRoute routeKey="admin.travel.create"><CreateTravelPlan /></FeatureGateRoute>} />
              <Route path="travel/:id" element={<FeatureGateRoute routeKey="admin.travel.edit"><EditTravelPlan /></FeatureGateRoute>} />
            
              {/* Tryouts */}
              <Route path="tryouts" element={<FeatureGateRoute routeKey="admin.tryouts.list"><AdminTryouts /></FeatureGateRoute>} />
              <Route path="tryouts/new" element={<FeatureGateRoute routeKey="admin.tryouts.create"><CreateTryout /></FeatureGateRoute>} />
              <Route path="tryouts/:tryoutId" element={<FeatureGateRoute routeKey="admin.tryouts.detail"><AdminTryoutDetail /></FeatureGateRoute>} />
            
              {/* Photos */}
              <Route path="photos" element={<FeatureGateRoute routeKey="admin.photos.list"><Suspense fallback={<AdminLoadingSpinner />}><AdminPhotosLayout /></Suspense></FeatureGateRoute>}>
                <Route index element={<PhotosDashboardView />} />
                <Route path="browse" element={<Suspense fallback={<AdminLoadingSpinner />}><PhotosBrowseView /></Suspense>} />
                <Route path="search" element={<Suspense fallback={<AdminLoadingSpinner />}><PhotosSearchView /></Suspense>} />
                <Route path="bulk" element={<Suspense fallback={<AdminLoadingSpinner />}><PhotosBulkView /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<AdminLoadingSpinner />}><PhotosSettingsView /></Suspense>} />
              </Route>
              <Route path="photos/create" element={<FeatureGateRoute routeKey="admin.photos.create"><Suspense fallback={<AdminLoadingSpinner />}><CreateGallery /></Suspense></FeatureGateRoute>} />
              <Route path="photos/:id" element={<FeatureGateRoute routeKey="admin.photos.detail"><Suspense fallback={<AdminLoadingSpinner />}><AdminGalleryDetail /></Suspense></FeatureGateRoute>} />
              <Route path="photos/:galleryId/photo/:photoId" element={<FeatureGateRoute routeKey="admin.photos.photo"><Suspense fallback={<AdminLoadingSpinner />}><PhotoDetail /></Suspense></FeatureGateRoute>} />
            
              {/* Videos */}
              <Route path="videos" element={<Suspense fallback={<AdminLoadingSpinner />}><CoachVideoLibrary /></Suspense>} />
              <Route path="videos/:id" element={<Suspense fallback={<AdminLoadingSpinner />}><CoachVideoDetail /></Suspense>} />
            
              {/* Users */}
              <Route path="users/new" element={<CreateUser />} />
              <Route path="users/:id" element={<EditUser />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="notifications/analytics" element={<AdminNotificationAnalytics />} />
            
              {/* Organization */}
              <Route path="organization" element={<OrganizationSettings />} />
              <Route path="organization/forms" element={<OrganizationStructureForms />} />
              <Route path="organization/users" element={<OrganizationUsers />} />
              <Route path="organization/bulk-invite" element={<BulkInvitePage />} />
              <Route path="organization/sub-orgs" element={<SubOrganizations />} />
              <Route path="organization/billing" element={<OrganizationBilling />} />
              <Route path="organization/billing/plan-selection" element={<PlanSelection />} />
              <Route path="organization/billing/checkout/success" element={<CheckoutSuccess />} />
              <Route path="organization/billing/checkout/cancel" element={<CheckoutCancel />} />
              
              {/* Personal Settings */}
              <Route path="settings" element={<AdminSettings />} />
              <Route path="settings/sport-profiles" element={<AdminSportSettings />} />
              <Route path="contact" element={<Suspense fallback={<AdminLoadingSpinner />}><AdminContactPage /></Suspense>} />
              <Route path="help" element={<Navigate to="/help" replace />} />
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
              <Route path={platformDemoManagementPath} element={<PlatformDemoManagement />} />
              <Route path={platformDemoManagementDetailPath} element={<PlatformDemoOrgDetail />} />
              <Route path={platformDemoInsightsPath} element={<PlatformDemoInsights />} />
              
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
              <Route path="settings" element={<PlatformAdminSettings />} />
              
              {/* Contact Submissions */}
              <Route path="contact-submissions" element={<ContactSubmissions />} />
              
              {/* Help Center */}
              <Route path="help-center/settings" element={<HelpCenterSettings />} />
              <Route path="help-center/role-mappings" element={<HelpCenterRoleMappings />} />
              <Route path="help-center/category-pages" element={<HelpCenterCategoryPages />} />
              <Route path="help-center/sections" element={<HelpCenterSections />} />
              <Route path="help-center/thumbnails" element={<HelpCenterThumbnails />} />
              
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

              {/* Ticketing (platform oversight) */}
              <Route path="ticketing/events" element={<PlatformTicketingAllEvents />} />
              <Route path="ticketing/orders" element={<PlatformTicketingOrderLookup />} />
              <Route path="ticketing/webhooks" element={<PlatformTicketingWebhookStatus />} />
              <Route path="ticketing/organizations/:id" element={<PlatformTicketingOrgDashboard />} />

              {/* Email Preview */}
              <Route path="email-preview" element={<EmailPreview />} />
              <Route path="emails" element={<EmailTemplates />} />
              <Route path="emails/new" element={<EmailTemplateEditor />} />
              <Route path="emails/:slug/edit" element={<EmailTemplateEditor />} />

              {/* Photos */}
              <Route path="photos" element={<PlatformPhotosOverview />} />
              <Route path="photos/content-review" element={<PlatformPhotosContentReview />} />
              <Route path="photos/storage" element={<PlatformPhotosStorage />} />
            </Route>
          </Route>
        </Routes>
    </>
  )
}

export default App
