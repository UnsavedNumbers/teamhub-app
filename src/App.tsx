import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { AuthProvider } from './hooks/useAuth'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { adminTheme } from './theme/adminTheme'
import AdminLoadingSpinner from './components/admin/AdminLoadingSpinner'

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
import Settings from './pages/Settings'
import Uniforms from './pages/Uniforms'
import Travel from './pages/Travel'
import Tryouts from './pages/Tryouts'
import Messages from './pages/Messages'

// Admin Layout (Material Dashboard)
import AdminLayout from './layouts/AdminLayout'

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
const AdminTryouts = lazy(() => import('./pages/admin/AdminTryouts'))
const OrganizationSettings = lazy(() => import('./pages/admin/OrganizationSettings'))
const OrganizationUsers = lazy(() => import('./pages/admin/OrganizationUsers'))
const OrganizationOnboarding = lazy(() => import('./pages/admin/OrganizationOnboarding'))

function App() {
  return (
    <OrganizationProvider>
      <AuthProvider>
        <Routes>
          {/* Marketing Landing Page - Public */}
          <Route path="/" element={<Marketing />} />

          {/* Portal Routes - Parents/Coaches */}
          <Route path="/portal">
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
            <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="children" element={<ProtectedRoute><Children /></ProtectedRoute>} />
            <Route path="join" element={<ProtectedRoute><JoinTeam /></ProtectedRoute>} />
            <Route path="calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
            <Route path="events/:eventId" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
            <Route path="payments" element={<ProtectedRoute><MyPayments /></ProtectedRoute>} />
            <Route path="uniforms" element={<ProtectedRoute><Uniforms /></ProtectedRoute>} />
            <Route path="travel" element={<ProtectedRoute><Travel /></ProtectedRoute>} />
            <Route path="tryouts" element={<ProtectedRoute><Tryouts /></ProtectedRoute>} />
            <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            
            {/* Redirect root portal to dashboard */}
            <Route index element={<Navigate to="/portal/dashboard" replace />} />
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
              <ProtectedRoute allowedRoles={['admin', 'org_admin']}>
                <ThemeProvider theme={adminTheme}>
                  <Suspense fallback={<AdminLoadingSpinner />}>
                    <AdminLayout />
                  </Suspense>
                </ThemeProvider>
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
            
            {/* Travel */}
            <Route path="travel" element={<TravelPlans />} />
            <Route path="travel/new" element={<CreateTravelPlan />} />
            
            {/* Tryouts */}
            <Route path="tryouts" element={<AdminTryouts />} />
            
            {/* Users */}
            <Route path="users/new" element={<CreateUser />} />
            
            {/* Organization */}
            <Route path="organization" element={<OrganizationSettings />} />
            <Route path="organization/users" element={<OrganizationUsers />} />
          </Route>
        </Routes>
      </AuthProvider>
    </OrganizationProvider>
  )
}

export default App
