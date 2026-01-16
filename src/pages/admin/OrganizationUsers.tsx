import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { adaptUserToTableRow, UserTableRow } from '../../utils/dataAdapters'
import { 
  PageHeader, 
  Card, 
  Badge, 
  PlatformDataTable, 
  Button, 
  type ColumnConfig 
} from '../../components/platformAdmin'

export default function OrganizationUsers() {
  const [users, setUsers] = useState<UserTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchUsers()
    }
  }, [currentOrganization, page, rowsPerPage])

  async function fetchUsers() {
    if (!currentOrganization?.id) {
      setLoading(false)
      return
    }
    setLoading(true); setError(null)
    try {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('org_id', currentOrganization.id)
      setTotalCount(count || 0)
      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      const { data, error } = await supabase.from('users').select('*, family:families(name)').eq('org_id', currentOrganization.id).order('created_at', { ascending: false }).range(from, to)
      if (error) { setError(error.message); return }
      const rows = (data || []) as any[]
      setUsers(rows.map(user => adaptUserToTableRow(user, user.family?.name ? { name: user.family.name } : null)))
    } catch (err) { setError('Failed to load users') } finally { setLoading(false) }
  }

  const getRoleVariant = (role: string): 'danger' | 'warning' | 'neutral' => {
    switch (role) {
      case 'org_admin': case 'admin': return 'danger'
      case 'coach': return 'warning'
      default: return 'neutral'
    }
  }

  const columns: ColumnConfig<UserTableRow>[] = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'role', label: 'Role', render: (row) => <Badge variant={getRoleVariant(row.role)}>{row.role.toUpperCase()}</Badge> },
    { id: 'familyName', label: 'Family' },
    { id: 'actions', label: 'Actions', align: 'right', render: (row) => (
      <button className="pa-btn pa-btn--ghost pa-btn--dense" onClick={(e) => { e.stopPropagation(); /* edit logic */ }}>
        <span className="material-symbols-outlined">edit</span>
      </button>
    )}
  ]

  return (
    <div className="pa-root">
      <PageHeader 
        title="Organization Users" 
        actions={<Button onClick={() => navigate('/admin/users/new')}><span className="material-symbols-outlined">add</span>Add User</Button>} 
      />
      {error && <div className="pa-card pa-mb-4" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
      <PlatformDataTable columns={columns} rows={users} loading={loading} totalCount={totalCount} page={page} rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage} />
    </div>
  )
}
