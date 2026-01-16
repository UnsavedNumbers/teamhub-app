import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { 
  PageHeader, 
  Card, 
  Badge, 
  Select, 
  PlatformDataTable, 
  Button, 
  Input, 
  type ColumnConfig 
} from '../../components/platformAdmin'

type UniformSubmissionStatus = 'not_submitted' | 'submitted' | 'locked' | 'fulfilled'

interface UniformKit {
  id: string
  name: string
  deadline_at: string | null
  locked_at: string | null
  team: { name: string }
  season: { name: string }
}

interface CreateKitItem {
  name: string
  required: boolean
  sort_order: number
  size_options: string[]
}

interface KitRosterRow {
  child_id: string
  first_name: string
  last_name: string
  team_id: string
  season_id: string
  kit_id: string
  kit_name: string
  deadline_at: string | null
  kit_locked_at: string | null
  submission_id: string | null
  submission_status: UniformSubmissionStatus
  submitted_at: string | null
  submission_locked_at: string | null
  fulfilled_at: string | null
  items: Array<{
    item_id: string
    name: string
    required: boolean
    sort_order: number
    size_options: string[]
    size: string | null
  }>
  child_name: string // Added for data table
}

interface TeamOption {
  id: string
  team: { name: string }
}

interface SeasonOption {
  id: string
  name: string
}

type UniformKitFilter = 'all' | 'open' | 'locked'

export default function UniformOrders() {
  const sb = supabase as any
  const { kitId } = useParams()
  const isDetail = !!kitId

  const [kits, setKits] = useState<UniformKit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<UniformKitFilter>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [roster, setRoster] = useState<KitRosterRow[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('Uniform Kit')
  const [createDeadline, setCreateDeadline] = useState<string>('')
  const [createTeamId, setCreateTeamId] = useState<string>('')
  const [createSeasonId, setCreateSeasonId] = useState<string>('')
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([])
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([])
  const [createItems, setCreateItems] = useState<CreateKitItem[]>(() => [
    { name: 'Jersey', required: true, sort_order: 10, size_options: ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'] },
    { name: 'Shorts', required: true, sort_order: 20, size_options: ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'] },
    { name: 'Socks', required: true, sort_order: 30, size_options: ['YS (1-3)', 'YM (4-6)', 'YL (7-9)', 'AS (6-8)', 'AM (8-10)', 'AL (10-12)'] },
  ])

  const { profile } = useAuth()
  const navigate = useNavigate()

  const fetchCreateOptions = useCallback(async () => {
    const [{ data: teamsData }, { data: seasonsData }] = await Promise.all([
      supabase.from('teams').select('id, team:teams(name)').order('created_at', { ascending: false }),
      supabase.from('seasons').select('id, name, team_id').order('created_at', { ascending: false }),
    ])

    const teams = ((teamsData as any[]) || []).map((t) => ({
      id: t.id,
      team: { name: t.name ?? t.team?.name ?? '' },
    }))
    setTeamOptions(teams.filter((t) => t.team.name))

    const seasons = (seasonsData as any[]) || []
    setSeasonOptions(seasons.map((s) => ({ id: s.id, name: s.name })))
  }, [])

  const fetchKits = useCallback(async () => {
    setLoading(true)
    try {
      let query = sb.from('uniform_kits').select('id, name, deadline_at, locked_at, team:teams(name), season:seasons(name)', { count: 'exact' })
      if (filter === 'open') query = query.is('locked_at', null)
      if (filter === 'locked') query = query.not('locked_at', 'is', null)
      const { count } = await query
      setTotalCount(count || 0)
      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      const { data } = await query.order('created_at', { ascending: false }).range(from, to)
      setKits((data as unknown as UniformKit[]) || [])
    } finally {
      setLoading(false)
    }
  }, [filter, page, rowsPerPage, sb])

  const fetchRoster = useCallback(async () => {
    if (!kitId) return
    setLoading(true)
    try {
      const { data, error } = await sb.rpc('get_uniform_kit_roster', { p_kit_id: kitId })
      if (error) throw error
      const rows = (data as any[]) || []
      setRoster(rows.map(r => ({ ...r, child_name: `${r.first_name} ${r.last_name}` })))
    } finally {
      setLoading(false)
    }
  }, [kitId, sb])

  useEffect(() => {
    if (isDetail) fetchRoster()
    else fetchKits()
  }, [isDetail, fetchKits, fetchRoster])

  const lockKit = async (id: string) => {
    if (!window.confirm('Are you sure you want to lock this kit?')) return
    await sb.rpc('lock_uniform_kit', { p_kit_id: id })
    if (isDetail) fetchRoster()
    else fetchKits()
  }

  const markFulfilled = async (submissionId: string) => {
    await sb.rpc('mark_uniform_submission_fulfilled', { p_submission_id: submissionId })
    fetchRoster()
  }

  const getStatusVariant = (status: UniformSubmissionStatus): 'success' | 'warning' | 'info' | 'neutral' => {
    switch (status) {
      case 'fulfilled': return 'success'
      case 'locked': return 'info'
      case 'submitted': return 'warning'
      default: return 'neutral'
    }
  }

  const exportCsv = (rows: KitRosterRow[]) => {
    const allItemNames = Array.from(new Set(rows.flatMap((r) => r.items || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)).map((i) => i.name)))
    const header = ['Player', 'Status', ...allItemNames].join(',')
    const lines = rows.map((r) => {
      const map = new Map((r.items || []).map((i) => [i.name, i.size ?? '']))
      return [`"${r.first_name} ${r.last_name}"`, r.submission_status, ...allItemNames.map((n) => `"${(map.get(n) || '').replace(/\"/g, '\"\"')}"`)].join(',')
    })
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uniform-kit-${kitId || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const createKit = async () => {
    await sb.rpc('create_uniform_kit', {
      p_team_id: createTeamId,
      p_season_id: createSeasonId,
      p_name: createName,
      p_deadline_at: createDeadline ? new Date(createDeadline).toISOString() : null,
      p_items: createItems,
    })
    setCreateOpen(false)
    fetchKits()
  }

  const kitColumns: ColumnConfig<UniformKit>[] = [
    { id: 'name', label: 'Kit' },
    { id: 'team_name', label: 'Team', render: (row) => row.team?.name },
    { id: 'season_name', label: 'Season', render: (row) => row.season?.name },
    { id: 'deadline', label: 'Deadline', render: (row) => row.deadline_at ? new Date(row.deadline_at).toLocaleDateString() : '—' },
    { id: 'locked', label: 'Locked', render: (row) => row.locked_at ? <Badge variant="info">YES</Badge> : <Badge variant="neutral">NO</Badge> },
    { 
      id: 'actions', 
      label: 'Actions', 
      align: 'right',
      render: (row) => (
        <div className="pa-flex pa-gap-2 pa-justify-end">
          <Button variant="secondary" onClick={(e) => { e.stopPropagation(); navigate(`/admin/uniforms/${row.id}`) }}>View</Button>
          {!row.locked_at && <Button variant="secondary" onClick={(e) => { e.stopPropagation(); lockKit(row.id) }}>Lock</Button>}
        </div>
      )
    }
  ]

  const rosterColumns: ColumnConfig<KitRosterRow>[] = [
    { id: 'child_name', label: 'Player' },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => <Badge variant={getStatusVariant(row.submission_status)}>{row.submission_status.replace('_', ' ').toUpperCase()}</Badge>
    },
    { 
      id: 'items', 
      label: 'Items',
      render: (row) => (
        <div className="pa-flex pa-gap-1 pa-flex-wrap">
          {(row.items || []).map(it => <Badge key={it.item_id} variant="neutral">{it.name}: {it.size || '—'}</Badge>)}
        </div>
      )
    },
    { 
      id: 'actions', 
      label: 'Actions', 
      align: 'right',
      render: (row) => (
        <Button 
          variant="secondary" 
          disabled={!row.submission_id || row.submission_status === 'fulfilled'}
          onClick={(e) => { e.stopPropagation(); row.submission_id && markFulfilled(row.submission_id) }}
        >
          Mark Fulfilled
        </Button>
      )
    }
  ]

  return (
    <div className="pa-root">
      <PageHeader 
        title={isDetail ? 'Uniform Kit' : 'Uniform Kits'} 
        actions={
          <div className="pa-flex pa-gap-3">
            {!isDetail && (
              <>
                <Select 
                  value={filter} 
                  onChange={e => setFilter(e.target.value as any)}
                  options={[{value: 'all', label: 'All'}, {value: 'open', label: 'Open'}, {value: 'locked', label: 'Locked'}]}
                />
                <Button onClick={() => { fetchCreateOptions(); setCreateOpen(true); }}>Create Kit</Button>
              </>
            )}
            {isDetail && (
              <>
                <Button variant="secondary" onClick={() => navigate('/admin/uniforms')}>Back</Button>
                <Button variant="secondary" onClick={() => exportCsv(roster)} disabled={roster.length === 0}>Export CSV</Button>
                <Button onClick={() => lockKit(kitId!)} disabled={roster.length === 0 || roster.every(r => r.kit_locked_at)}>Lock Kit</Button>
              </>
            )}
          </div>
        }
      />

      <PlatformDataTable
        columns={isDetail ? rosterColumns : kitColumns}
        rows={isDetail ? roster : kits}
        loading={loading}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRowClick={isDetail ? undefined : row => navigate(`/admin/uniforms/${row.id}`)}
      />

      {createOpen && (
        <div className="pa-modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="pa-card pa-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 className="pa-h2 pa-mb-4">CREATE UNIFORM KIT</h2>
            <div className="pa-flex pa-flex-col pa-gap-4">
              <Input label="Kit Name" value={createName} onChange={e => setCreateName(e.target.value)} />
              <Input label="Deadline" type="date" value={createDeadline} onChange={e => setCreateDeadline(e.target.value)} />
              <Select label="Team" value={createTeamId} onChange={e => setCreateTeamId(e.target.value)} options={teamOptions.map(t => ({ value: t.id, label: t.team.name }))} />
              <Select label="Season" value={createSeasonId} onChange={e => setCreateSeasonId(e.target.value)} options={seasonOptions.map(s => ({ value: s.id, label: s.name }))} />
              
              <div className="pa-text-overline pa-mt-4">ITEMS</div>
              {createItems.map((it, idx) => (
                <div key={idx} className="pa-card pa-mb-2" style={{ padding: 'var(--pa-space-3)' }}>
                  <Input label="Item Name" value={it.name} onChange={e => { const next = [...createItems]; next[idx].name = e.target.value; setCreateItems(next); }} />
                  <Input label="Size Options (comma separated)" value={it.size_options.join(', ')} onChange={e => { const next = [...createItems]; next[idx].size_options = e.target.value.split(',').map(s => s.trim()).filter(Boolean); setCreateItems(next); }} />
                </div>
              ))}
            </div>
            <div className="pa-flex pa-gap-3 pa-mt-6 pa-justify-end">
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={createKit} disabled={!createTeamId || !createSeasonId || !createName.trim()} loading={loading}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
