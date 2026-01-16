import { useState } from 'react'
import { Table, Badge, type TableColumn } from '../../components/platformAdmin'

// Example data type
interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'viewer'
  status: 'active' | 'inactive' | 'pending'
  lastLogin: string
  teams: number
}

// Example data
const sampleUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    role: 'admin',
    status: 'active',
    lastLogin: '2026-01-15T10:30:00Z',
    teams: 3,
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    email: 'marcus.j@example.com',
    role: 'user',
    status: 'active',
    lastLogin: '2026-01-14T15:22:00Z',
    teams: 1,
  },
  {
    id: '3',
    name: 'Aisha Patel',
    email: 'aisha.patel@example.com',
    role: 'viewer',
    status: 'inactive',
    lastLogin: '2025-12-20T09:15:00Z',
    teams: 0,
  },
  {
    id: '4',
    name: 'James Wilson',
    email: 'james.w@example.com',
    role: 'user',
    status: 'pending',
    lastLogin: 'Never',
    teams: 0,
  },
]

/**
 * Example Table Usage - Nike + Google Design System
 * 
 * Demonstrates:
 * - Sortable columns
 * - Custom cell rendering (badges, links)
 * - Row selection
 * - Pagination
 * - Inline actions
 */
export default function TableExample() {
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Column configuration
  const columns: TableColumn<User>[] = [
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      cellType: 'primary',
      render: (user) => (
        <div className="pa-table-cell-with-avatar">
          <div
            className="pa-table-avatar"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            {user.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <a href={`/platform-admin/users/${user.id}`} onClick={(e) => e.stopPropagation()}>
            {user.name}
          </a>
        </div>
      ),
    },
    {
      id: 'email',
      label: 'Email',
      sortable: true,
      cellType: 'secondary',
    },
    {
      id: 'role',
      label: 'Role',
      sortable: true,
      render: (user) => {
        const variant =
          user.role === 'admin' ? 'info' : user.role === 'user' ? 'neutral' : 'warning'
        return (
          <Badge variant={variant as 'info' | 'neutral' | 'warning'}>
            {user.role.toUpperCase()}
          </Badge>
        )
      },
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      render: (user) => {
        const variant =
          user.status === 'active'
            ? 'success'
            : user.status === 'inactive'
            ? 'danger'
            : 'warning'
        return (
          <Badge variant={variant}>
            {user.status}
          </Badge>
        )
      },
    },
    {
      id: 'teams',
      label: 'Teams',
      sortable: true,
      align: 'right',
      cellType: 'numeric',
    },
    {
      id: 'lastLogin',
      label: 'Last Login',
      sortable: true,
      cellType: 'meta',
      render: (user) => {
        if (user.lastLogin === 'Never') return 'Never'
        const date = new Date(user.lastLogin)
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      },
    },
    {
      id: 'actions',
      label: '',
      render: (user) => (
        <div className="pa-table-actions">
          <button
            className="pa-table-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              alert(`Edit ${user.name}`)
            }}
            aria-label={`Edit ${user.name}`}
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button
            className="pa-table-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              alert(`Delete ${user.name}`)
            }}
            aria-label={`Delete ${user.name}`}
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
          <button
            className="pa-table-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              alert(`More actions for ${user.name}`)
            }}
            aria-label={`More actions for ${user.name}`}
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      ),
    },
  ]

  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(columnId)
      setSortDirection('asc')
    }
  }

  const handleRowClick = (user: User) => {
    console.log('Row clicked:', user)
  }

  return (
    <div>
      <div className="pa-page-header">
        <div className="pa-page-header-content">
          <h1 className="pa-page-title">TABLE EXAMPLE</h1>
          <p className="pa-page-subtitle">
            Nike + Google design system data table with sorting, selection, and pagination
          </p>
        </div>
        <div className="pa-page-actions">
          <button className="pa-btn pa-btn--secondary pa-btn--compact">
            <span className="material-symbols-outlined">filter_list</span>
            Filter
          </button>
          <button className="pa-btn pa-btn--primary pa-btn--compact">
            <span className="material-symbols-outlined">add</span>
            Add User
          </button>
        </div>
      </div>

      {selectedRows.size > 0 && (
        <div
          className="pa-card pa-mb-4"
          style={{
            borderLeft: '3px solid var(--pa-blue)',
            background: 'var(--pa-info-bg)',
          }}
        >
          <div className="pa-flex pa-items-center pa-justify-between">
            <span className="pa-body-m">
              <strong>{selectedRows.size}</strong> row{selectedRows.size > 1 ? 's' : ''} selected
            </span>
            <div className="pa-flex pa-gap-2">
              <button className="pa-btn pa-btn--ghost pa-btn--dense">
                <span className="material-symbols-outlined">mail</span>
                Email
              </button>
              <button className="pa-btn pa-btn--ghost pa-btn--dense">
                <span className="material-symbols-outlined">download</span>
                Export
              </button>
              <button
                className="pa-btn pa-btn--ghost pa-btn--dense"
                onClick={() => setSelectedRows(new Set())}
              >
                <span className="material-symbols-outlined">close</span>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <Table
        columns={columns}
        data={sampleUsers}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={handleRowClick}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        selectable
        zebra={false}
        compact={false}
        pagination={{
          currentPage,
          totalPages: Math.ceil(sampleUsers.length / rowsPerPage),
          rowsPerPage,
          totalRows: sampleUsers.length,
          onPageChange: setCurrentPage,
          onRowsPerPageChange: setRowsPerPage,
        }}
      />

      <div className="pa-mt-5">
        <h2 className="pa-h2 pa-mb-3">COMPACT MODE</h2>
        <Table
          columns={columns.slice(0, 5)}
          data={sampleUsers}
          compact
          onRowClick={handleRowClick}
        />
      </div>

      <div className="pa-mt-5">
        <h2 className="pa-h2 pa-mb-3">EMPTY STATE</h2>
        <Table
          columns={columns}
          data={[]}
          emptyState={
            <>
              <div className="pa-table-empty-icon">
                <span className="material-symbols-outlined">person_off</span>
              </div>
              <h3 className="pa-table-empty-title">NO USERS FOUND</h3>
              <p className="pa-table-empty-text">
                Get started by adding your first user to the platform.
              </p>
              <button className="pa-btn pa-btn--primary">
                <span className="material-symbols-outlined">add</span>
                Add First User
              </button>
            </>
          }
        />
      </div>
    </div>
  )
}
