import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getOrganizationUsers } from '../../data/services/usersService'
import { 
  AdminPageHeader, 
  Button, 
  Badge,
  InlineNotice,
  OrgDataTable,
  type ColumnConfig,
} from '../../components/admin'
import { mapDbRoleToFrontendRole } from '../../utils/roleHelpers'
import { formatDate } from '../../utils/dateFormatters'
import '../../styles/orgAdmin.css'

interface OrgUser {
  id: string
  email: string
  display_name: string | null
  phone: string | null
  roles: string[]
  created_at: string
}

export default function OrganizationUsers() {
  const [allUsers, setAllUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)


  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()
  const location = useLocation()

  const fetchUsers = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    try {
      const { data, error: fetchError } = await getOrganizationUsers(context)
      
      if (fetchError) {
        setError(fetchError.message || 'Failed to load users')
        setAllUsers([])
      } else {
        setAllUsers(data)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
      setAllUsers([])
    } finally {
      setLoading(false)
    }
  }, [context, isReady])

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
      window.history.replaceState({}, document.title)

      setTimeout(() => setSuccessMessage(null), 5000)
    }
  }, [location.state])

  useEffect(() => {
    if (isReady) fetchUsers()
  }, [isReady, fetchUsers])

  const columns: ColumnConfig<OrgUser>[] = [
    { 
      id: 'email', 
      label: 'Email',
      render: (row) => (
        <div>
          <div className="oa-body-m" style={{ fontWeight: 600 }}>{row.email}</div>
          {row.display_name && (
            <div className="oa-body-s oa-text-muted">{row.display_name}</div>
          )}
        </div>
      )
    },
    { 
      id: 'phone', 
      label: 'Phone',
      render: (row) => row.phone || '—'
    },
    { 
      id: 'roles', 
      label: 'Roles',
      render: (row) => (
        <div className="oa-flex oa-gap-2">
          {row.roles.map((role: string) => {
            // Map database role to frontend role for display
            const dbRole = role as 'org_admin' | 'coach' | 'parent'
            const frontendRole = mapDbRoleToFrontendRole(dbRole)
            return (
              <Badge 
                key={role} 
                variant={frontendRole === 'admin' ? 'info' : frontendRole === 'coach' ? 'info' : 'neutral'}
              >
                {frontendRole.toUpperCase()}
              </Badge>
            )
          })}
        </div>
      )
    },
    { 
      id: 'created_at', 
      label: 'Joined',
      render: (row) => formatDate(row.created_at, 'short')
    },
    { 
      id: 'actions', 
      label: 'Actions', 
      align: 'right',
      render: (row) => (
        <Button 
          variant="ghost" 
          size="compact"
          onClick={(e: React.MouseEvent<HTMLElement>) => { 
            e.stopPropagation()
            navigate(`/admin/organization/users/${row.id}/edit`)
          }}
        >
          <span className="material-symbols-outlined">edit</span>
        </Button>
      )
    }
  ]

  // Client-side pagination
  const paginatedUsers = allUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <div className="oa-root">
      <AdminPageHeader 
        title={t('admin.users.title')}
        subtitle={t('admin.users.subtitle')} 
        actions={
          <Button onClick={() => navigate('/admin/users/new')} variant="primary" icon="add" className="w-full sm:w-auto">
            {t('admin.users.createSubtitle').replace('Add', 'Create').split(' ')[0] || 'Add'} User
          </Button>
        }
      />

      {successMessage && (
        <InlineNotice
          tone="success"
          title={successMessage}
          onClose={() => setSuccessMessage(null)}
          className="oa-mb-4"
        />
      )}

      {error && (
        <InlineNotice
          tone="error"
          title="Unable to load users"
          message={error}
          actions={
            <Button
              variant="ghost"
              size="dense"
              icon="refresh"
              onClick={fetchUsers}
              disabled={loading}
            >
              Retry
            </Button>
          }
          onClose={() => setError(null)}
          className="oa-mb-4"
        />
      )}

      <OrgDataTable
        columns={columns}
        rows={paginatedUsers}
        loading={loading}
        totalCount={allUsers.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No users found. Create your first user to get started."
      />
    </div>
  )
}
