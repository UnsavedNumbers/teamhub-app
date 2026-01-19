import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getOrganizationUsers } from '../../data/services/usersService'
import { 
  AdminPageHeader, 
  Button, 
  PlatformDataTable, 
  Badge,
  type ColumnConfig 
} from '../../components/platformAdmin'

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
          {row.roles.map((role: string) => (
            <Badge 
              key={role} 
              variant={role === 'admin' ? 'info' : role === 'coach' ? 'info' : 'neutral'}
            >
              {role.toUpperCase()}
            </Badge>
          ))}
        </div>
      )
    },
    { 
      id: 'created_at', 
      label: 'Joined',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
    { 
      id: 'actions', 
      label: 'Actions', 
      align: 'right',
      render: (_row) => (
        <Button 
          variant="ghost" 
          size="compact"
          onClick={(e: React.MouseEvent<HTMLElement>) => { 
            e.stopPropagation()
            // TODO: Implement edit user
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
        title="Organization Users" 
        actions={
          <Button onClick={() => navigate('/admin/users/new')}>
            <span className="material-symbols-outlined">add</span>
            Add User
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

