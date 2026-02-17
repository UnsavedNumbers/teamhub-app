import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getAthleteById } from '../../data/services/familyService'
import { getAthleteSports } from '../../data/services/athleteSportsService'
import { getAthleteGuardians, linkGuardianToAthlete, removeGuardianFromAthlete, validateGuardianEmail, getAthleteInvites, cancelInvite, resendInvite } from '../../data/services/guardianService'
import AthleteAvatar from '../../components/portal/AthleteAvatar'
import { supabase } from '../../lib/supabase'
import { getLink } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import { Button, Card, Table, type TableColumn, Badge, ConfirmDialog } from '../../components/admin'
import { Tabs, TabsList, TabsTrigger, TabsContent, StatCard } from '../../components/platformAdmin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getDisplayName, calculateAge, getGenderLabel, formatSports } from '../../utils/athleteHelpers'
import { formatPhoneDisplay } from '../../utils/phoneFormatting'
import { GuardianMatchIndicator } from '../../components/admin/GuardianMatchIndicator'
import { checkGuardianMatch, debounce } from '../../utils/guardianMatching'
import { useSportFieldDefinitions } from '../../hooks/useSportFieldDefinitions'
import { useAthleteSportProfile } from '../../hooks/useAthleteSportProfile'
import { PhotoSection } from '@/components/galleries/PhotoSection'
import type { Athlete, Guardian, GuardianMatch, PendingGuardianInvite } from '../../types/family'
import type { AthleteSportWithDetails } from '../../data/services/athleteSportsService'
import type { SportCode } from '../../types/sports'
import '../../styles/orgAdmin.css'

interface TeamMembership {
  id: string
  team_id: string
  team_name: string
  season_id: string
  season_name: string
  status: 'active' | 'inactive' | 'pending'
  jersey_number: string | null
}

function formatUpdatedRelative(iso: string | null | undefined): string {
  if (!iso) return 'Updated recently'
  const dt = new Date(iso)
  if (Number.isNaN(dt.valueOf())) return 'Updated recently'

  const diffMs = Date.now() - dt.valueOf()
  const diffSec = Math.floor(diffMs / 1000)
  const absSec = Math.abs(diffSec)

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (absSec < 60) return `Updated ${rtf.format(-diffSec, 'second')}`
  const diffMin = Math.floor(diffSec / 60)
  const absMin = Math.abs(diffMin)
  if (absMin < 60) return `Updated ${rtf.format(-diffMin, 'minute')}`
  const diffHr = Math.floor(diffMin / 60)
  const absHr = Math.abs(diffHr)
  if (absHr < 24) return `Updated ${rtf.format(-diffHr, 'hour')}`
  const diffDay = Math.floor(diffHr / 24)
  return `Updated ${rtf.format(-diffDay, 'day')}`
}

export default function AthleteDetail() {
  const { id: athleteId } = useParams<{ id: string }>()
  const t = useT()
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [sports, setSports] = useState<AthleteSportWithDetails[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingGuardianInvite[]>([])
  const [teams, setTeams] = useState<TeamMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const [navigating, setNavigating] = useState(false)

  // Link Guardian Modal State
  const [showLinkGuardianModal, setShowLinkGuardianModal] = useState(false)
  const [inviteMode, setInviteMode] = useState<'single' | 'bulk'>('single')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [bulkEmails, setBulkEmails] = useState('')
  const [bulkResults, setBulkResults] = useState<Array<{ email: string; status: 'success' | 'error'; message: string }>>([])
  const [guardianMatch, setGuardianMatch] = useState<GuardianMatch | null>(null)
  const [isCheckingGuardian, setIsCheckingGuardian] = useState(false)
  const [isLinkingGuardian, setIsLinkingGuardian] = useState(false)
  const [isBulkLinking] = useState(false)
  const [linkGuardianError, setLinkGuardianError] = useState<string | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  // Remove Guardian Confirmation State
  const [guardianToRemove, setGuardianToRemove] = useState<{ userId: string; email: string } | null>(null)
  const [isRemovingGuardian, setIsRemovingGuardian] = useState(false)

  // Alert/Error Dialog State
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string; variant?: 'info' | 'warning' | 'danger' } | null>(null)

  // Invite Action States
  const [inviteActionLoading, setInviteActionLoading] = useState<string | null>(null)

  // Sport Profiles State
  const [selectedSport, setSelectedSport] = useState<SportCode>('soccer')


  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const isMountedRef = useRef(true)

  // Sport Profile Data Hooks
  const { profile: sportProfile, loading: sportProfileLoading } = useAthleteSportProfile(
    athleteId || '',
    selectedSport
  )
  const { profileFields, equipmentFields } = useSportFieldDefinitions(selectedSport)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchAthleteData = useCallback(async () => {
    if (!athleteId || !isReady) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch athlete
      const { data: athleteData, error: athleteError } = await getAthleteById(context, athleteId)

      if (athleteError || !athleteData) {
        if (isMountedRef.current) {
          setError(athleteError?.message || t('admin.athletes.notFound'))
          setLoading(false)
        }
        return
      }

      if (!isMountedRef.current) {
        setLoading(false)
        return
      }

      setAthlete(athleteData)

      // Fetch sports
      const { data: sportsData } = await getAthleteSports(athleteId, context.orgId)
      if (isMountedRef.current && sportsData) {
        setSports(sportsData)
      }

      // Fetch guardians
      const { data: guardiansData } = await getAthleteGuardians(athleteId, context.orgId)
      if (isMountedRef.current && guardiansData) {
        setGuardians(guardiansData)
      }

      // Fetch pending invites
      const { data: invitesData } = await getAthleteInvites(athleteId, context.orgId)
      if (isMountedRef.current && invitesData) {
        setPendingInvites(invitesData.map(invite => ({
          id: invite.id,
          email: invite.email,
          status: invite.status,
          expires_at: invite.expires_at,
          created_at: invite.created_at,
          token: invite.token
        })))
      }

      // Fetch team memberships
      const { data: teamsData, error: teamsError } = await supabase
        .from('team_memberships')
        .select(`
          id,
          team_id,
          season_id,
          status,
          teams!inner(id, name),
          seasons!inner(id, name),
          athlete:athletes(jersey_number)
        `)
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false })

      if (!teamsError && teamsData && isMountedRef.current) {
        const teamMemberships: TeamMembership[] = teamsData.map((row: any) => ({
          id: row.id,
          team_id: row.team_id,
          team_name: row.teams?.name || t('admin.athletes.unknownTeam'),
          season_id: row.season_id,
          season_name: row.seasons?.name || t('admin.athletes.unknownSeason'),
          status: row.status,
          jersey_number: row.athlete?.jersey_number || null,
          position: row.position,
        }))
        setTeams(teamMemberships)
      }

      if (isMountedRef.current) {
        setLoading(false)
      }
    } catch (err) {
      console.error('Error fetching athlete data:', err)
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : t('admin.athletes.errorLoading'))
        setLoading(false)
      }
    }
  }, [athleteId, context, isReady, t])

  useEffect(() => {
    if (athleteId && isReady) {
      fetchAthleteData()
    }
  }, [athleteId, isReady, fetchAthleteData])

  const handleTabChange = useCallback(
    (tab: string) => {
      if (navigating) return
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.set('tab', tab)
      setSearchParams(newSearchParams, { replace: true })
    },
    [searchParams, setSearchParams, navigating]
  )

  const handleBreadcrumbClick = useCallback(
    (path: string) => {
      if (navigating || !path) return
      setNavigating(true)
      navigate(path)
    },
    [navigate, navigating]
  )

  const handleEditClick = useCallback(() => {
    if (navigating || !athleteId) return
    setNavigating(true)
    navigate(getLink('admin.athletes.detail', { id: athleteId }) + '/edit')
  }, [navigate, navigating, athleteId])

  const handleTeamClick = useCallback(
    (teamId: string) => {
      if (navigating || !teamId) return
      setNavigating(true)
      navigate(getLink('admin.teams.detail', { id: teamId }))
    },
    [navigate, navigating]
  )


  // Debounced guardian email check
  const debouncedCheckGuardian = useMemo(
    () => debounce(async (email: string, orgId: string) => {
      if (!email || !validateGuardianEmail(email)) {
        setGuardianMatch(null)
        setIsCheckingGuardian(false)
        return
      }

      setIsCheckingGuardian(true)
      setLinkGuardianError(null)

      try {
        const match = await checkGuardianMatch(email, orgId)
        if (isMountedRef.current) {
          setGuardianMatch(match)
          // Check if already linked to this athlete
          if (match && match.exists && athleteId) {
            const isAlreadyLinked = match.linkedAthletes.some(a => a.id === athleteId)
            if (isAlreadyLinked) {
              setLinkGuardianError(t('admin.athletes.guardians.alreadyLinked'))
            }
          }
        }
      } catch (err) {
        console.error('Error checking guardian:', err)
        if (isMountedRef.current) {
          setLinkGuardianError(t('admin.athletes.guardians.checkError'))
        }
      } finally {
        if (isMountedRef.current) {
          setIsCheckingGuardian(false)
        }
      }
    }, 300),
    [athleteId, t]
  )

  // Check guardian when email changes
  useEffect(() => {
    if (emailTouched && guardianEmail && showLinkGuardianModal) {
      debouncedCheckGuardian(guardianEmail, context.orgId)
    }
  }, [guardianEmail, context.orgId, emailTouched, showLinkGuardianModal, debouncedCheckGuardian])

  // Autofocus email input when modal opens
  useEffect(() => {
    if (showLinkGuardianModal && emailInputRef.current) {
      setTimeout(() => {
        emailInputRef.current?.focus()
      }, 100)
    }
  }, [showLinkGuardianModal])

  // Reset modal state when closed
  useEffect(() => {
    if (!showLinkGuardianModal) {
      setGuardianEmail('')
      setBulkEmails('')
      setBulkResults([])
      setGuardianMatch(null)
      setLinkGuardianError(null)
      setEmailTouched(false)
      setIsCheckingGuardian(false)
      setIsLinkingGuardian(false)
      setInviteMode('single')
    }
  }, [showLinkGuardianModal])

  const handleOpenLinkGuardianModal = useCallback(() => {
    setShowLinkGuardianModal(true)
  }, [])

  const handleCloseLinkGuardianModal = useCallback(() => {
    if (isLinkingGuardian) return // Prevent closing while linking
    setShowLinkGuardianModal(false)
  }, [isLinkingGuardian])

  const handleLinkGuardian = useCallback(async () => {
    if (!athleteId || !guardianEmail || !validateGuardianEmail(guardianEmail)) {
      setLinkGuardianError(t('admin.athletes.guardians.invalidEmail'))
      return
    }

    // Check if already linked
    if (guardianMatch && guardianMatch.exists && athleteId) {
      const isAlreadyLinked = guardianMatch.linkedAthletes.some(a => a.id === athleteId)
      if (isAlreadyLinked) {
        setLinkGuardianError(t('admin.athletes.guardians.alreadyLinked'))
        return
      }
    }

    setIsLinkingGuardian(true)
    setLinkGuardianError(null)

    try {
      const { error } = await linkGuardianToAthlete(
        athleteId,
        guardianEmail,
        context.orgId,
        'parent'
      )

      if (error) {
        if (isMountedRef.current) {
          setLinkGuardianError(error.message || t('admin.athletes.guardians.linkError'))
        }
        return
      }

      // Refresh guardians list
      const { data: guardiansData } = await getAthleteGuardians(athleteId, context.orgId)
      if (isMountedRef.current && guardiansData) {
        setGuardians(guardiansData)
      }

      // Refresh pending invites list (in case an invite was created)
      const { data: invitesData } = await getAthleteInvites(athleteId, context.orgId)
      if (isMountedRef.current && invitesData) {
        setPendingInvites(invitesData.map(invite => ({
          id: invite.id,
          email: invite.email,
          status: invite.status,
          expires_at: invite.expires_at,
          created_at: invite.created_at,
          token: invite.token
        })))
      }

      // Reset form state
      if (isMountedRef.current) {
        setGuardianEmail('')
        setEmailTouched(false)
        setGuardianMatch(null)
        setLinkGuardianError(null)
        setShowLinkGuardianModal(false)
        // Could show a toast here if available
      }
    } catch (err) {
      console.error('Error linking guardian:', err)
      if (isMountedRef.current) {
        setLinkGuardianError(err instanceof Error ? err.message : t('admin.athletes.guardians.linkError'))
      }
    } finally {
      if (isMountedRef.current) {
        setIsLinkingGuardian(false)
      }
    }
  }, [athleteId, guardianEmail, guardianMatch, context.orgId, t, isMountedRef])

  const handleRemoveGuardianClick = useCallback(
    (guardianUserId: string, guardianEmail: string) => {
      if (isLinkingGuardian) return
      setGuardianToRemove({ userId: guardianUserId, email: guardianEmail })
    },
    [isLinkingGuardian]
  )

  const handleConfirmRemoveGuardian = useCallback(
    async () => {
      if (!athleteId || !guardianToRemove || isLinkingGuardian) return

      setIsRemovingGuardian(true)

      try {
        const { success, error } = await removeGuardianFromAthlete(
          athleteId,
          guardianToRemove.userId,
          context.orgId
        )

        if (error || !success) {
          if (isMountedRef.current) {
            setAlertDialog({
              open: true,
              title: t('admin.athletes.guardians.removeError'),
              message: error?.message || t('admin.athletes.guardians.removeError'),
              variant: 'danger'
            })
            setIsRemovingGuardian(false)
          }
          return
        }

        // Refresh guardians list
        const { data: guardiansData } = await getAthleteGuardians(athleteId, context.orgId)
        if (isMountedRef.current && guardiansData) {
          setGuardians(guardiansData)
        }

        if (isMountedRef.current) {
          setGuardianToRemove(null)
          setIsRemovingGuardian(false)
        }
      } catch (err) {
        console.error('Error removing guardian:', err)
        if (isMountedRef.current) {
          setAlertDialog({
            open: true,
            title: t('admin.athletes.guardians.removeError'),
            message: t('admin.athletes.guardians.removeError'),
            variant: 'danger'
          })
          setIsRemovingGuardian(false)
        }
      }
    },
    [athleteId, guardianToRemove, context.orgId, isLinkingGuardian, t]
  )

  const handleCancelRemoveGuardian = useCallback(() => {
    setGuardianToRemove(null)
    setIsRemovingGuardian(false)
  }, [])

  const handleCancelInvite = useCallback(async (inviteId: string) => {
    if (!athleteId || inviteActionLoading) return
    
    setInviteActionLoading(inviteId)
    
    try {
      const { success, error } = await cancelInvite(inviteId)
      
      if (error || !success) {
        if (isMountedRef.current) {
          setAlertDialog({
            open: true,
            title: t('admin.athletes.guardians.cancelInviteError'),
            message: error?.message || t('admin.athletes.guardians.cancelInviteError'),
            variant: 'danger'
          })
          setInviteActionLoading(null)
        }
        return
      }
      
      // Refresh pending invites
      const { data: invitesData } = await getAthleteInvites(athleteId, context.orgId)
      if (isMountedRef.current && invitesData) {
        setPendingInvites(invitesData.map(invite => ({
          id: invite.id,
          email: invite.email,
          status: invite.status,
          expires_at: invite.expires_at,
          created_at: invite.created_at,
          token: invite.token
        })))
      }
    } catch (err) {
      console.error('Error canceling invite:', err)
      if (isMountedRef.current) {
        setAlertDialog({
          open: true,
          title: t('admin.athletes.guardians.cancelInviteError'),
          message: t('admin.athletes.guardians.cancelInviteError'),
          variant: 'danger'
        })
        setInviteActionLoading(null)
      }
    } finally {
      if (isMountedRef.current) {
        setInviteActionLoading(null)
      }
    }
  }, [athleteId, context.orgId, inviteActionLoading, t])

  const handleResendInvite = useCallback(async (inviteId: string) => {
    if (!athleteId || inviteActionLoading) return
    
    setInviteActionLoading(inviteId)
    
    try {
      const { success, error } = await resendInvite(inviteId)
      
      if (error || !success) {
        if (isMountedRef.current) {
          setAlertDialog({
            open: true,
            title: t('admin.athletes.guardians.resendInviteError'),
            message: error?.message || t('admin.athletes.guardians.resendInviteError'),
            variant: 'danger'
          })
          setInviteActionLoading(null)
        }
        return
      }
      
      // Refresh pending invites
      const { data: invitesData } = await getAthleteInvites(athleteId, context.orgId)
      if (isMountedRef.current && invitesData) {
        setPendingInvites(invitesData.map(invite => ({
          id: invite.id,
          email: invite.email,
          status: invite.status,
          expires_at: invite.expires_at,
          created_at: invite.created_at,
          token: invite.token
        })))
      }
      
      // Show success feedback
      if (isMountedRef.current) {
        setAlertDialog({
          open: true,
          title: t('admin.athletes.guardians.inviteResent'),
          message: t('admin.athletes.guardians.inviteResent'),
          variant: 'info'
        })
      }
    } catch (err) {
      console.error('Error resending invite:', err)
      if (isMountedRef.current) {
        setAlertDialog({
          open: true,
          title: t('admin.athletes.guardians.resendInviteError'),
          message: t('admin.athletes.guardians.resendInviteError'),
          variant: 'danger'
        })
        setInviteActionLoading(null)
      }
    } finally {
      if (isMountedRef.current) {
        setInviteActionLoading(null)
      }
    }
  }, [athleteId, context.orgId, inviteActionLoading, t])

  const handleBulkInvite = useCallback(async () => {
    if (!athleteId || !bulkEmails.trim()) {
      setLinkGuardianError(t('admin.athletes.guardians.bulkEmailsRequired'))
      return
    }

    const emails = bulkEmails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && validateGuardianEmail(email))

    if (emails.length === 0) {
      setLinkGuardianError(t('admin.athletes.guardians.noValidEmails'))
      return
    }

    setBulkResults([])
    setLinkGuardianError(null)

    try {
      const results: Array<{ email: string; status: 'success' | 'error'; message: string }> = []

      for (const email of emails) {
        try {
          const { error } = await linkGuardianToAthlete(
            athleteId,
            email,
            context.orgId,
            'parent'
          )

          if (error) {
            results.push({
              email,
              status: 'error',
              message: error.message || t('admin.athletes.guardians.linkError')
            })
          } else {
            results.push({
              email,
              status: 'success',
              message: t('admin.athletes.guardians.inviteSent')
            })
          }
        } catch (err) {
          results.push({
            email,
            status: 'error',
            message: t('admin.athletes.guardians.linkError')
          })
        }
      }

      setBulkResults(results)

      // Refresh guardians and invites
      const { data: guardiansData } = await getAthleteGuardians(athleteId, context.orgId)
      if (isMountedRef.current && guardiansData) {
        setGuardians(guardiansData)
      }

      const { data: invitesData } = await getAthleteInvites(athleteId, context.orgId)
      if (isMountedRef.current && invitesData) {
        setPendingInvites(invitesData.map(invite => ({
          id: invite.id,
          email: invite.email,
          status: invite.status,
          expires_at: invite.expires_at,
          created_at: invite.created_at,
          token: invite.token
        })))
      }
    } catch (err) {
      console.error('Error in bulk invite:', err)
      setLinkGuardianError(t('admin.athletes.guardians.bulkInviteError'))
    }
  }, [athleteId, bulkEmails, context.orgId, t])

  // Team table columns - MUST be before conditional returns (Rules of Hooks)
  const teamColumns: TableColumn<TeamMembership>[] = useMemo(() => [
    {
      key: 'team_name',
      header: t('admin.athletes.table.team').toUpperCase(),
      render: (row) => (
        <button
          onClick={() => handleTeamClick(row.team_id)}
          disabled={navigating}
          className="oa-link"
          style={{
            fontWeight: 700,
            textDecoration: 'none',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: navigating ? 'not-allowed' : 'pointer',
            opacity: navigating ? 0.6 : 1,
          }}
        >
          {row.team_name}
        </button>
      ),
    },
    {
      key: 'season_name',
      header: t('admin.athletes.table.season').toUpperCase(),
      render: (row) => row.season_name,
    },
    {
      key: 'jersey_number',
      header: t('admin.athletes.table.jersey').toUpperCase(),
      align: 'center',
      render: (row) => row.jersey_number || '—',
    },
    {
      key: 'status',
      header: t('admin.athletes.table.status').toUpperCase(),
      render: (row) => (
        <Badge
          variant={row.status === 'active' ? 'success' : row.status === 'pending' ? 'warning' : 'neutral'}
        >
          {row.status}
        </Badge>
      ),
    },
  ], [handleTeamClick, navigating, t])

  // Guardian table columns - MUST be before conditional returns (Rules of Hooks)
  const guardianColumns: TableColumn<Guardian>[] = useMemo(() => [
    {
      key: 'display_name',
      header: t('admin.athletes.table.name').toUpperCase(),
      render: (guardian) => guardian.display_name || guardian.email,
    },
    {
      key: 'email',
      header: t('admin.athletes.table.email').toUpperCase(),
      render: (guardian) => guardian.email,
    },
    {
      key: 'phone',
      header: t('admin.athletes.table.phone').toUpperCase(),
      render: (guardian) => guardian.phone || '—',
    },
    {
      key: 'relationship_type',
      header: t('admin.athletes.table.relationship').toUpperCase(),
      render: (guardian) => {
        const type = guardian.relationship_type || 'parent'
        return type.charAt(0).toUpperCase() + type.slice(1)
      },
    },
    {
      key: 'status',
      header: t('admin.athletes.table.status').toUpperCase(),
      render: (guardian) => (
        <Badge
          variant={guardian.status === 'active' ? 'success' : guardian.status === 'pending' ? 'warning' : 'neutral'}
        >
          {guardian.status}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: t('admin.athletes.table.action').toUpperCase(),
      align: 'right',
      render: (guardian) => (
        <Button
          variant="secondary"
          size="compact"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            handleRemoveGuardianClick(guardian.user_id, guardian.email)
          }}
          disabled={isLinkingGuardian || isRemovingGuardian}
        >
          {t('admin.athletes.guardians.remove')}
        </Button>
      ),
    },
  ], [t, handleRemoveGuardianClick, isLinkingGuardian, isRemovingGuardian])

  // Pending invites table columns
  const pendingInviteColumns: TableColumn<PendingGuardianInvite>[] = useMemo(() => [
    {
      key: 'email',
      header: t('admin.athletes.table.email').toUpperCase(),
      render: (invite) => invite.email,
    },
    {
      key: 'status',
      header: t('admin.athletes.table.status').toUpperCase(),
      render: () => (
        <Badge variant="warning">
          {t('admin.athletes.guardians.invitePending')}
        </Badge>
      ),
    },
    {
      key: 'expires_at',
      header: t('admin.athletes.guardians.expires').toUpperCase(),
      render: (invite) => {
        const expiresDate = new Date(invite.expires_at)
        const isExpired = expiresDate < new Date()
        return (
          <span style={{ color: isExpired ? 'var(--oa-danger)' : 'inherit' }}>
            {isExpired ? t('admin.athletes.guardians.expired') : expiresDate.toLocaleDateString()}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: t('admin.athletes.table.action').toUpperCase(),
      align: 'right',
      render: (invite) => (
        <div style={{ display: 'flex', gap: 'var(--oa-space-2)', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            size="compact"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              handleResendInvite(invite.id)
            }}
            disabled={inviteActionLoading === invite.id}
            loading={inviteActionLoading === invite.id}
          >
            {t('admin.athletes.guardians.resend')}
          </Button>
          <Button
            variant="secondary"
            size="compact"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              handleCancelInvite(invite.id)
            }}
            disabled={inviteActionLoading === invite.id}
          >
            {t('admin.athletes.guardians.cancelInvite')}
          </Button>
        </div>
      ),
    },
  ], [t, handleResendInvite, handleCancelInvite, inviteActionLoading])


  // Early returns - after all hooks
  if (loading) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <div style={{ padding: '24px' }}>
          <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div className="oa-skeleton" style={{ height: '320px', borderRadius: '8px', marginBottom: '24px' }} />
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--oa-n200)' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '40px', width: '120px' }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '200px' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!athlete || error) {
    return (
      <div className="oa-root">
        <div className="oa-page-header">
          <h1 className="oa-page-title">{t('admin.athletes.notFound')}</h1>
          {error && <p className="oa-body-m" style={{ color: 'var(--oa-danger)', marginTop: 'var(--oa-space-2)' }}>{error}</p>}
          <div style={{ marginTop: 'var(--oa-space-4)' }}>
            <OrgAdminButton variant="primary" onClick={() => navigate(getLink('admin.athletes.list'))}>
              {t('admin.athletes.backToList')}
            </OrgAdminButton>
          </div>
        </div>
      </div>
    )
  }

  // Derived values - after null checks
  const displayName = getDisplayName(athlete)
  const age = calculateAge(athlete.date_of_birth)
  const genderLabel = getGenderLabel(athlete.gender)
  const { plays, interested } = formatSports(athlete.sports)
  const updatedLabel = formatUpdatedRelative(athlete.updated_at)
  const primaryColor = 'var(--oa-theme-action-primary, var(--org-btn-primary-bg, #137fec))'

  // Stats
  const activeTeams = teams.filter(t => t.status === 'active').length
  const totalTeams = teams.length
  const playsCount = plays.length
  const interestedCount = interested.length

  return (
    <div className="oa-root">
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          padding: 'var(--oa-space-6) var(--oa-space-4)',
          paddingBottom: 'var(--oa-space-10)',
        }}
        className="md:px-8"
      >
        {/* Breadcrumbs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--oa-space-2)',
            marginBottom: 'var(--oa-space-6)',
          }}
        >
          <button
            onClick={() => handleBreadcrumbClick(getLink('admin.organization.structure'))}
            disabled={navigating}
            style={{
              color: primaryColor,
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: navigating ? 'not-allowed' : 'pointer',
              opacity: navigating ? 0.6 : 1,
              padding: 0,
              lineHeight: 'normal',
            }}
          >
            ORGANIZATIONS
          </button>
          <span style={{ color: 'var(--oa-n400)', fontSize: '12px', fontWeight: 700, lineHeight: 'normal' }}>/</span>
          <button
            onClick={() => handleBreadcrumbClick(getLink('admin.athletes.list'))}
            disabled={navigating}
            style={{
              color: primaryColor,
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: navigating ? 'not-allowed' : 'pointer',
              opacity: navigating ? 0.6 : 1,
              padding: 0,
              lineHeight: 'normal',
            }}
          >
            {t('admin.athletes.breadcrumb').toUpperCase()}
          </button>
          <span style={{ color: 'var(--oa-n400)', fontSize: '12px', fontWeight: 700, lineHeight: 'normal' }}>/</span>
          <span
            style={{
              color: 'var(--oa-n600)',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              lineHeight: 'normal',
            }}
            className="dark:text-slate-400"
          >
            {displayName.toUpperCase()}
          </span>
        </div>

        {/* Athlete Header - ESPN/NBA Style */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--oa-space-6)',
            marginBottom: 'var(--oa-space-8)',
          }}
        >
          {/* Top Row: Avatar, Name, Edit Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--oa-space-6)',
              flexWrap: 'wrap',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: '120px',
                height: '120px',
                background: 'var(--oa-white)',
                borderRadius: 'var(--oa-radius-l)',
                border: '2px solid var(--oa-n200)',
                boxShadow: 'var(--oa-shadow-2)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
              className="dark:bg-slate-800 dark:border-slate-700"
            >
              {athlete && (
                <AthleteAvatar athlete={athlete} photoSize="512" className="w-full h-full object-cover" />
              )}
            </div>

            {/* Name and Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--oa-space-4)', flexWrap: 'wrap', marginBottom: 'var(--oa-space-3)' }}>
                <h1
                  style={{
                    fontFamily: 'var(--oa-font-display)',
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    fontWeight: 900,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    color: 'var(--oa-n900)',
                    margin: 0,
                  }}
                  className="dark:text-white"
                >
                  {displayName}
                </h1>
                <OrgAdminButton
                  onClick={handleEditClick}
                  disabled={navigating}
                  variant="primary"
                  icon="edit"
                  size="compact"
                >
                  {t('admin.athletes.edit')}
                </OrgAdminButton>
              </div>

              {/* Info Badges Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--oa-space-2)', alignItems: 'center' }}>
                {age !== null && (
                  <Badge variant="neutral">
                    Age {age}
                  </Badge>
                )}
                {genderLabel !== 'Not specified' && (
                  <Badge variant="neutral">
                    {genderLabel}
                  </Badge>
                )}
                {athlete.jersey_number && (
                  <Badge variant="info">
                    #{athlete.jersey_number}
                  </Badge>
                )}
                {plays.length > 0 && (
                  <Badge variant="success">
                    {plays.length} {plays.length === 1 ? 'Sport' : 'Sports'}
                  </Badge>
                )}
                {activeTeams > 0 && (
                  <Badge variant="info">
                    {activeTeams} {activeTeams === 1 ? 'Active Team' : 'Active Teams'}
                  </Badge>
                )}
                <Badge variant="neutral">
                  {updatedLabel}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--oa-space-4)',
              marginBottom: 'var(--oa-space-8)',
            }}
          >
          <StatCard
            label={t('admin.athletes.stats.activeTeams')}
            value={activeTeams.toString()}
            icon="group"
            onClick={activeTeams > 0 ? () => handleTabChange('teams') : undefined}
          />
          <StatCard
            label={t('admin.athletes.stats.totalTeams')}
            value={totalTeams.toString()}
            icon="groups"
          />
          <StatCard
            label={t('admin.athletes.stats.sportsPlayed')}
            value={playsCount.toString()}
            icon="sports"
            onClick={playsCount > 0 ? () => handleTabChange('sports') : undefined}
          />
          <StatCard
            label={t('admin.athletes.stats.guardians')}
            value={`${guardians.filter(g => g.status === 'active').length}${pendingInvites.length > 0 ? ` (+${pendingInvites.length})` : ''}`}
            icon="family_restroom"
            onClick={(guardians.length > 0 || pendingInvites.length > 0) ? () => handleTabChange('guardians') : undefined}
          />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="overview">{t('admin.athletes.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="sport_profiles">Sport Profiles</TabsTrigger>
            <TabsTrigger value="teams">{t('admin.athletes.tabs.teams', { count: totalTeams })}</TabsTrigger>
            <TabsTrigger value="sports">{t('admin.athletes.tabs.sports', { count: playsCount + interestedCount })}</TabsTrigger>
            <TabsTrigger value="guardians">
              {t('admin.athletes.tabs.guardians', { count: guardians.length + pendingInvites.length })}
              {pendingInvites.length > 0 && (
                <span 
                  style={{ 
                    marginLeft: 'var(--oa-space-2)', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: 'var(--oa-warning-500, #f59e0b)',
                    display: 'inline-block'
                  }} 
                />
              )}
            </TabsTrigger>
            <TabsTrigger value="medical">{t('admin.athletes.tabs.medical')}</TabsTrigger>
            <TabsTrigger value="galleries">Galleries</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div style={{ display: 'grid', gap: 'var(--oa-space-6)' }}>
              {/* Guardian Status Banner */}
              {athlete && (
                <Card style={{ 
                  background: athlete.has_active_guardian 
                    ? 'var(--oa-n50, #f5f6f7)' 
                    : 'var(--oa-n25, #fafafa)', 
                  border: `1px solid ${athlete.has_active_guardian ? 'var(--oa-n200, #d8dde3)' : 'var(--oa-n200, #d8dde3)'}`,
                  padding: 'var(--oa-space-4)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--oa-space-3)' }}>
                    <span 
                      className="material-symbols-outlined" 
                      style={{ 
                        fontSize: '20px',
                        color: athlete.has_active_guardian 
                          ? 'var(--oa-success, #10b981)' 
                          : 'var(--oa-n500, #7a8794)'
                      }}
                    >
                      {athlete.has_active_guardian ? 'check_circle' : 'info'}
                    </span>
                    <p className="oa-body-m" style={{ margin: 0, color: 'var(--oa-n700, #2b343d)' }}>
                      {athlete.has_active_guardian 
                        ? 'This athlete has an active guardian account connected.'
                        : 'This athlete does not have an active guardian account connected.'}
                    </p>
                  </div>
                </Card>
              )}

              {/* Pending Guardian Invites Alert */}
              {pendingInvites.length > 0 && (
                <Card style={{ 
                  background: 'var(--oa-warning-50, #fffbeb)', 
                  border: '1px solid var(--oa-warning-200, #fde68a)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--oa-space-3)' }}>
                    <span 
                      className="material-symbols-rounded" 
                      style={{ color: 'var(--oa-warning-600, #d97706)', fontSize: '24px' }}
                    >
                      mail
                    </span>
                    <div style={{ flex: 1 }}>
                      <h3 className="oa-body-l" style={{ fontWeight: 700, margin: 0, color: 'var(--oa-warning-800, #92400e)' }}>
                        {t('admin.athletes.guardians.pendingInvitesTitle', { count: pendingInvites.length })}
                      </h3>
                      <p className="oa-body-s" style={{ color: 'var(--oa-warning-700, #b45309)', marginTop: 'var(--oa-space-1)', marginBottom: 'var(--oa-space-3)' }}>
                        {pendingInvites.map(i => i.email).join(', ')}
                      </p>
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => handleTabChange('guardians')}
                      >
                        {t('admin.athletes.guardians.viewInvites')}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Basic Information */}
              <Card>
                <h2 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-4)' }}>{t('admin.athletes.basicInfo.title')}</h2>
                <div style={{ display: 'grid', gap: 'var(--oa-space-4)' }}>
                  <div>
                    <label className="oa-label">{t('admin.athletes.basicInfo.fullName')}</label>
                    <p className="oa-body-m">{athlete.first_name} {athlete.last_name}</p>
                  </div>
                  {athlete.preferred_name && (
                    <div>
                      <label className="oa-label">{t('admin.athletes.basicInfo.preferredName')}</label>
                      <p className="oa-body-m">{athlete.preferred_name}</p>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--oa-space-4)' }}>
                    {age !== null && (
                      <div>
                        <label className="oa-label">{t('admin.athletes.basicInfo.age')}</label>
                        <p className="oa-body-m">{t('admin.athletes.basicInfo.yearsOld', { age })}</p>
                      </div>
                    )}
                    {genderLabel !== 'Not specified' && (
                      <div>
                        <label className="oa-label">{t('admin.athletes.basicInfo.gender')}</label>
                        <p className="oa-body-m">{genderLabel}</p>
                      </div>
                    )}
                    {athlete.date_of_birth && (
                      <div>
                        <label className="oa-label">{t('admin.athletes.basicInfo.dateOfBirth')}</label>
                        <p className="oa-body-m">{new Date(athlete.date_of_birth).toLocaleDateString()}</p>
                      </div>
                    )}
                    {athlete.jersey_number && (
                      <div>
                        <label className="oa-label">{t('admin.athletes.basicInfo.jerseyNumber')}</label>
                        <p className="oa-body-m">#{athlete.jersey_number}</p>
                      </div>
                    )}
                  </div>
                  {(athlete.phone || athlete.email) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--oa-space-4)', marginTop: 'var(--oa-space-4)' }}>
                      {athlete.phone && (
                        <div>
                          <label className="oa-label">Phone</label>
                          <p className="oa-body-m">
                            <a href={`tel:${athlete.phone}`} className="oa-link">
                              {formatPhoneDisplay(athlete.phone)}
                            </a>
                          </p>
                        </div>
                      )}
                      {athlete.email && (
                        <div>
                          <label className="oa-label">Email</label>
                          <p className="oa-body-m">
                            <a href={`mailto:${athlete.email}`} className="oa-link">
                              {athlete.email}
                            </a>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Sports Summary */}
              {(plays.length > 0 || interested.length > 0) && (
                <Card>
                  <h2 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-4)' }}>{t('admin.athletes.sports.title')}</h2>
                  <div style={{ display: 'grid', gap: 'var(--oa-space-3)' }}>
                    {plays.length > 0 && (
                      <div>
                        <label className="oa-label">{t('admin.athletes.sports.plays')}</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--oa-space-2)', marginTop: 'var(--oa-space-2)' }}>
                          {plays.map((sport) => (
                            <Badge key={sport} variant="success">{sport}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {interested.length > 0 && (
                      <div>
                        <label className="oa-label">{t('admin.athletes.sports.interested')}</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--oa-space-2)', marginTop: 'var(--oa-space-2)' }}>
                          {interested.map((sport) => (
                            <Badge key={sport} variant="neutral">{sport}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Emergency Contact */}
              {(athlete.emergency_contact_name || athlete.emergency_contact_phone) && (
                <Card>
                  <h2 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-4)' }}>{t('admin.athletes.emergencyContact.title')}</h2>
                  <div style={{ display: 'grid', gap: 'var(--oa-space-4)' }}>
                    {athlete.emergency_contact_name && (
                      <div>
                        <label className="oa-label">{t('admin.athletes.emergencyContact.name')}</label>
                        <p className="oa-body-m">{athlete.emergency_contact_name}</p>
                      </div>
                    )}
                    {athlete.emergency_contact_phone && (
                      <div>
                        <label className="oa-label">{t('admin.athletes.emergencyContact.phone')}</label>
                        <p className="oa-body-m">
                          <a href={`tel:${athlete.emergency_contact_phone}`} className="oa-link">
                            {athlete.emergency_contact_phone}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sport_profiles">
            <div style={{ marginBottom: 'var(--oa-space-4)' }}>
              <Card>
                <h2 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-4)' }}>Select Sport</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--oa-space-3)' }}>
                  {(['soccer', 'basketball', 'baseball', 'football'] as SportCode[]).map((sport) => (
                    <button
                      key={sport}
                      onClick={() => setSelectedSport(sport)}
                      className="oa-btn"
                      style={{
                        padding: 'var(--oa-space-4)',
                        border: selectedSport === sport ? '2px solid var(--oa-theme-action-primary)' : '1px solid var(--oa-border-default)',
                        background: selectedSport === sport ? 'var(--oa-theme-action-primary-bg)' : 'transparent',
                        borderRadius: 'var(--oa-radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 'var(--oa-space-2)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>sports</span>
                      <span className="oa-body-s" style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                        {sport.replace('_', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {sportProfileLoading ? (
              <div className="oa-skeleton" style={{ height: '200px' }} />
            ) : (
              <div style={{ display: 'grid', gap: 'var(--oa-space-6)' }}>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--oa-space-4)' }}>
                    <h2 className="oa-card-title" style={{ margin: 0 }}>Profile Data</h2>
                    <Badge variant={sportProfile?.completeness_score === 100 ? 'success' : 'warning'}>
                      {sportProfile?.completeness_score || 0}% Complete
                    </Badge>
                  </div>
                  
                  {profileFields.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--oa-space-4)' }}>
                      {profileFields.map((field) => (
                        <div key={field.field_key}>
                          <p className="oa-label">{field.field_label}</p>
                          <p className="oa-body-m">
                            {sportProfile?.profile_data[field.field_key]?.toString() || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="oa-body-m" style={{ color: 'var(--oa-n500)' }}>
                      No profile fields configured for this sport
                    </p>
                  )}
                </Card>

                <Card>
                  <h2 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-4)' }}>Equipment Data</h2>
                  {equipmentFields.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--oa-space-4)' }}>
                      {equipmentFields.map((field) => (
                        <div key={field.field_key}>
                          <p className="oa-label">{field.field_label}</p>
                          <p className="oa-body-m">
                            {sportProfile?.equipment_data[field.field_key]?.toString() || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="oa-body-m" style={{ color: 'var(--oa-n500)' }}>
                      No equipment fields configured for this sport
                    </p>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="teams">
            <Card>
              <h2 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-4)' }}>{t('admin.athletes.teams.title')}</h2>
              {teams.length === 0 ? (
                <p className="oa-body-m" style={{ color: 'var(--oa-n500)' }}>{t('admin.athletes.teams.empty')}</p>
              ) : (
                <Table columns={teamColumns} data={teams} />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="sports">
            <Card>
              <h2 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-4)' }}>{t('admin.athletes.sports.title')}</h2>
              {sports.length === 0 ? (
                <p className="oa-body-m" style={{ color: 'var(--oa-n500)' }}>{t('admin.athletes.sports.empty')}</p>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--oa-space-4)' }}>
                  {plays.length > 0 && (
                    <div>
                      <h3 className="oa-body-l" style={{ fontWeight: 700, marginBottom: 'var(--oa-space-3)' }}>{t('admin.athletes.sports.plays')}</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--oa-space-2)' }}>
                        {sports.filter(s => s.sport_type === 'plays').map((sport) => (
                          <Badge key={sport.sport_id} variant="success">{sport.sport_name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {interested.length > 0 && (
                    <div>
                      <h3 className="oa-body-l" style={{ fontWeight: 700, marginBottom: 'var(--oa-space-3)' }}>{t('admin.athletes.sports.interested')}</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--oa-space-2)' }}>
                        {sports.filter(s => s.sport_type === 'interested').map((sport) => (
                          <Badge key={sport.sport_id} variant="neutral">{sport.sport_name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="guardians">
            <div style={{ display: 'grid', gap: 'var(--oa-space-6)' }}>
              {/* Pending Invites Section */}
              {pendingInvites.length > 0 && (
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--oa-space-4)' }}>
                    <h2 className="oa-card-title" style={{ margin: 0 }}>{t('admin.athletes.guardians.pendingInvites')}</h2>
                    <Badge variant="warning">{pendingInvites.length}</Badge>
                  </div>
                  <p className="oa-body-s" style={{ color: 'var(--oa-n500)', marginBottom: 'var(--oa-space-4)' }}>
                    {t('admin.athletes.guardians.pendingInvitesDesc')}
                  </p>
                  <Table columns={pendingInviteColumns} data={pendingInvites} />
                </Card>
              )}

              {/* Active Guardians Section */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--oa-space-4)' }}>
                  <h2 className="oa-card-title" style={{ margin: 0 }}>{t('admin.athletes.guardians.title')}</h2>
                  <OrgAdminButton
                    variant="primary"
                    icon="person_add"
                    onClick={handleOpenLinkGuardianModal}
                    disabled={isLinkingGuardian}
                  >
                    {t('admin.athletes.guardians.add')}
                  </OrgAdminButton>
                </div>
                {guardians.length === 0 && pendingInvites.length === 0 ? (
                  <p className="oa-body-m" style={{ color: 'var(--oa-n500)' }}>{t('admin.athletes.guardians.empty')}</p>
                ) : guardians.length === 0 ? (
                  <p className="oa-body-m" style={{ color: 'var(--oa-n500)' }}>{t('admin.athletes.guardians.noActiveGuardians')}</p>
                ) : (
                  <Table columns={guardianColumns} data={guardians} />
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="medical">
            <div style={{ display: 'grid', gap: 'var(--oa-space-6)' }}>
              <Card>
                <h2 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-4)' }}>{t('admin.athletes.medical.title')}</h2>
                {athlete.medical_notes ? (
                  <div>
                    <label className="oa-label">{t('admin.athletes.medical.notes')}</label>
                    <p className="oa-body-m" style={{ whiteSpace: 'pre-wrap', marginTop: 'var(--oa-space-2)' }}>{athlete.medical_notes}</p>
                  </div>
                ) : (
                  <p className="oa-body-m" style={{ color: 'var(--oa-n500)' }}>{t('admin.athletes.medical.noNotes')}</p>
                )}
              </Card>

              <Card>
                <h2 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-4)' }}>{t('admin.athletes.medical.allergies')}</h2>
                {athlete.allergies ? (
                  <div>
                    <label className="oa-label">{t('admin.athletes.medical.knownAllergies')}</label>
                    <p className="oa-body-m" style={{ whiteSpace: 'pre-wrap', marginTop: 'var(--oa-space-2)' }}>{athlete.allergies}</p>
                  </div>
                ) : (
                  <p className="oa-body-m" style={{ color: 'var(--oa-n500)' }}>{t('admin.athletes.medical.noAllergies')}</p>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="galleries">
            <Card>
              <h2 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-3)' }}>Photos</h2>
              <PhotoSection
                entityType="athlete"
                entityId={athlete.id}
                orgId={athlete.org_id}
                title="Athlete Photos"
                context="admin"
              />
            </Card>
          </TabsContent>
          </Tabs>
        </div>

      {/* Link Guardian Modal */}
      {showLinkGuardianModal && (
        <div
          onClick={handleCloseLinkGuardianModal}
          className="oa-modal-overlay"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="oa-modal"
          >
            {/* Header */}
            <div className="oa-modal-header">
              <h2 className="oa-h2">{t('admin.athletes.guardians.linkTitle')}</h2>
            </div>

            {/* Content */}
            <div className="oa-modal-content">
              {/* Mode Toggle */}
              <div className="oa-mb-4">
                <div className="oa-flex oa-gap-2">
                  <Button
                    variant={inviteMode === 'single' ? 'primary' : 'secondary'}
                    size="compact"
                    onClick={() => setInviteMode('single')}
                  >
                    {t('admin.athletes.guardians.singleInvite')}
                  </Button>
                  <Button
                    variant={inviteMode === 'bulk' ? 'primary' : 'secondary'}
                    size="compact"
                    onClick={() => setInviteMode('bulk')}
                  >
                    {t('admin.athletes.guardians.bulkInvite')}
                  </Button>
                </div>
              </div>

              {inviteMode === 'single' ? (
                <div className="oa-form-group">
                  <label className="oa-label">
                    {t('admin.athletes.guardians.emailLabel')}
                  </label>
                  <div className="oa-input-wrapper">
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={guardianEmail}
                      onChange={(e) => {
                        setGuardianEmail(e.target.value)
                        if (!emailTouched) setEmailTouched(true)
                        setLinkGuardianError(null)
                      }}
                      placeholder={t('admin.athletes.guardians.emailPlaceholder')}
                      disabled={isLinkingGuardian}
                      className={linkGuardianError && emailTouched ? 'oa-input oa-input--error' : 'oa-input'}
                      autoFocus
                    />
                  </div>
                  {linkGuardianError && emailTouched && (
                    <p className="oa-body-s oa-helper oa-helper--error">
                      {linkGuardianError}
                    </p>
                  )}

                  {/* Match Indicator */}
                  {emailTouched && guardianEmail && !linkGuardianError && (
                    <div className="oa-mt-3">
                      <GuardianMatchIndicator
                        match={guardianMatch}
                        isLoading={isCheckingGuardian}
                        error={null}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="oa-form-group">
                    <label className="oa-label">
                      {t('admin.athletes.guardians.bulkEmailsLabel')}
                    </label>
                    <div className="oa-input-wrapper">
                      <textarea
                        value={bulkEmails}
                        onChange={(e) => setBulkEmails(e.target.value)}
                        placeholder={t('admin.athletes.guardians.bulkEmailsPlaceholder')}
                        className="oa-input"
                        rows={6}
                        style={{ fontFamily: 'monospace', fontSize: '14px' }}
                        disabled={isBulkLinking}
                      />
                    </div>
                    <p className="oa-body-xs oa-text-muted oa-mt-2">
                      {t('admin.athletes.guardians.bulkEmailsHelp')}
                    </p>
                    {linkGuardianError && (
                      <p className="oa-body-s oa-helper oa-helper--error oa-mt-2">
                        {linkGuardianError}
                      </p>
                    )}
                  </div>

                  {bulkResults.length > 0 && (
                    <div className="oa-mt-4">
                      <p className="oa-label oa-mb-2">{t('admin.athletes.guardians.bulkResults')}</p>
                      <div className="oa-space-y-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {bulkResults.map((result, idx) => (
                          <div
                            key={idx}
                            className={`oa-p-2 oa-rounded ${
                              result.status === 'success' 
                                ? 'oa-bg-emerald-50 dark:oa-bg-emerald-900/20' 
                                : 'oa-bg-red-50 dark:oa-bg-red-900/20'
                            }`}
                          >
                            <div className="oa-flex oa-items-center oa-gap-2">
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                {result.status === 'success' ? 'check_circle' : 'error'}
                              </span>
                              <span className="oa-text-sm oa-font-medium">{result.email}</span>
                              <span className="oa-text-xs oa-text-muted">{result.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="oa-modal-footer">
              <Button
                variant="secondary"
                onClick={handleCloseLinkGuardianModal}
                disabled={isLinkingGuardian || isBulkLinking}
              >
                {t('admin.athletes.guardians.cancel')}
              </Button>
              {inviteMode === 'single' ? (
                <OrgAdminButton
                  variant="primary"
                  onClick={handleLinkGuardian}
                  disabled={isLinkingGuardian || !guardianEmail || !validateGuardianEmail(guardianEmail) || !!linkGuardianError}
                  loading={isLinkingGuardian}
                >
                  {t('admin.athletes.guardians.linkButton')}
                </OrgAdminButton>
              ) : (
                <OrgAdminButton
                  variant="primary"
                  onClick={handleBulkInvite}
                  disabled={isBulkLinking || !bulkEmails.trim()}
                  loading={isBulkLinking}
                >
                  {t('admin.athletes.guardians.bulkInviteButton')}
                </OrgAdminButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove Guardian Confirmation Dialog */}
      <ConfirmDialog
        open={!!guardianToRemove}
        title={t('admin.athletes.guardians.removeTitle')}
        description={t('admin.athletes.guardians.confirmRemove', { email: guardianToRemove?.email || '' })}
        confirmLabel={t('admin.athletes.guardians.remove')}
        cancelLabel={t('admin.athletes.guardians.cancel')}
        variant="danger"
        onConfirm={handleConfirmRemoveGuardian}
        onCancel={handleCancelRemoveGuardian}
      />

      {/* Alert/Error Dialog */}
      {alertDialog && (
        <ConfirmDialog
          open={alertDialog.open}
          title={alertDialog.title}
          description={alertDialog.message}
          confirmLabel="OK"
          cancelLabel="Cancel"
          variant={alertDialog.variant === 'danger' ? 'danger' : 'primary'}
          onConfirm={() => setAlertDialog(null)}
          onCancel={() => setAlertDialog(null)}
        />
      )}
    </div>
  </div>
)
}



