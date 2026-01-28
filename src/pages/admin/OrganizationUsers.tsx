import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getOrganizationUsers } from '../../data/services/usersService'
import { 
  AdminPageHeader, 
  Button, 
  PlatformDataTable, 
  Badge,
  type ColumnConfig 
} from '../../components/platformAdmin'
import { mapDbRoleToFrontendRole } from '../../utils/roleHelpers'
import { formatDate } from '../../utils/dateFormatters'

interface OrgUser {
  id: string
  email: string
  display_name: string | null
  phone: string | null
  roles: string[]
  created_at: string
}

export default function OrganizationUsers() {
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)


  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const fetchUsers = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    const { data, error } = await getOrganizationUsers(context)
    
    if (!error) {
      setUsers(data)
    }
    setLoading(false)
  }, [context, isReady])

  useEffect(() => {
    if (isReady) fetchUsers()
  }, [isReady, fetchUsers])

  const columns: ColumnConfig<OrgUser>[] = [
    { 
      id: 'email', 
      label: 'Email',
      render: (row) => (
        <div>
          <div className="pa-body-m" style={{ fontWeight: 600 }}>{row.email}</div>
          {row.display_name && (
            <div className="pa-body-s pa-text-muted">{row.display_name}</div>
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
        <div className="pa-flex pa-gap-2">
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

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title={t('admin.users.title')}
        subtitle={t('admin.users.subtitle')} 
        actions={
          <Button onClick={() => navigate('/admin/users/new')}>
            <span className="material-symbols-outlined">add</span>
            {t('admin.users.createSubtitle').replace('Add', 'Create').split(' ')[0] || 'Add'} User
          </Button>
        }
      />

      <PlatformDataTable
        columns={columns}
        rows={users}
        loading={loading}
        totalCount={users.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No users found. Create your first user to get started."
      />
    </div>
  )
}

