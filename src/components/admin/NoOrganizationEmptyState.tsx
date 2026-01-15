import { Box, Typography, Button, Card, CardContent } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { Business as BusinessIcon, Mail as MailIcon, Dashboard as DashboardIcon } from '@mui/icons-material'

interface NoOrganizationEmptyStateProps {
  /**
   * Optional variant for different contexts
   * - 'full': Full-page empty state (default)
   * - 'card': Card-based empty state for dashboard
   */
  variant?: 'full' | 'card'
}

/**
 * Empty state component shown when an org_admin has no organizations.
 * Provides clear CTAs to set up an organization or accept an invite.
 * 
 * This component is used in two contexts:
 * 1. Global gate in ProtectedRoute for /admin/* routes
 * 2. Explicit empty state in AdminDashboard
 */
export function NoOrganizationEmptyState({ variant = 'full' }: NoOrganizationEmptyStateProps) {
  const navigate = useNavigate()

  const content = (
    <Box
      sx={{
        textAlign: 'center',
        py: variant === 'full' ? 8 : 4,
        px: 3,
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: 2,
          backgroundColor: 'action.hover',
          mb: 3,
        }}
      >
        <BusinessIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
      </Box>

      {/* Title */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
        Create or join an organization to continue
      </Typography>

      {/* Description */}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
        You need to be part of an organization to access admin features. 
        Set up a new organization or accept an invitation from an existing one.
      </Typography>

      {/* Primary CTAs */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 2 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<BusinessIcon />}
          onClick={() => navigate('/admin/onboarding')}
        >
          Set up an organization
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<MailIcon />}
          onClick={() => navigate('/portal/accept-invite')}
        >
          Accept invite
        </Button>
      </Box>

      {/* Secondary CTA */}
      <Button
        variant="text"
        size="small"
        startIcon={<DashboardIcon />}
        onClick={() => navigate('/portal/dashboard')}
        sx={{ mt: 1 }}
      >
        Go to portal dashboard
      </Button>
    </Box>
  )

  // Wrap in card for dashboard variant
  if (variant === 'card') {
    return (
      <Card>
        <CardContent>{content}</CardContent>
      </Card>
    )
  }

  // Full-page variant
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {content}
    </Box>
  )
}
