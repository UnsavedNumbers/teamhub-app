import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  MenuItem,
  Select,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from '@mui/material'
import type { ChipProps } from '@mui/material/Chip'
import type { SelectChangeEvent } from '@mui/material/Select'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

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
  // Typed Supabase client lags behind new schema during migrations; use untyped client for new uniforms tables/RPC.
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
    {
      name: 'Jersey',
      required: true,
      sort_order: 10,
      size_options: ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'],
    },
    {
      name: 'Shorts',
      required: true,
      sort_order: 20,
      size_options: ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'],
    },
    {
      name: 'Socks',
      required: true,
      sort_order: 30,
      size_options: ['YS (1-3)', 'YM (4-6)', 'YL (7-9)', 'AS (6-8)', 'AM (8-10)', 'AL (10-12)'],
    },
  ])

  const { profile } = useAuth()
  const navigate = useNavigate()

  const canAccessAdmin = useMemo(() => {
    return !!profile && (profile.role === 'admin' || profile.organizations.some((org) => org.role === 'org_admin'))
  }, [profile])

  useEffect(() => {
    if (!profile || !canAccessAdmin) {
      navigate('/portal/unauthorized')
      return
    }
  }, [profile, canAccessAdmin, navigate])

  const fetchCreateOptions = useCallback(async () => {
    const [{ data: teamsData }, { data: seasonsData }] = await Promise.all([
      supabase.from('teams').select('id, team:teams(name)').order('created_at', { ascending: false }),
      supabase.from('seasons').select('id, name, team_id').order('created_at', { ascending: false }),
    ])

    // teams table doesn't alias itself; normalize
    const teams = ((teamsData as unknown as Array<{ id: string; name?: string; team?: { name: string } }>) || []).map((t) => ({
      id: t.id,
      team: { name: (t as any).name ?? t.team?.name ?? '' },
    }))
    setTeamOptions(teams.filter((t) => t.team.name))

    const seasons = (seasonsData as unknown as Array<{ id: string; name: string; team_id: string }>) || []
    // Keep all seasons; filter by team on selection
    setSeasonOptions(seasons.map((s) => ({ id: s.id, name: s.name })))
  }, [])

  const fetchKits = useCallback(async () => {
    setLoading(true)
    try {
      let query = sb
        .from('uniform_kits')
        .select('id, name, deadline_at, locked_at, team:teams(name), season:seasons(name)', { count: 'exact' })

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
      setRoster((data as unknown as KitRosterRow[]) || [])
    } finally {
      setLoading(false)
    }
  }, [kitId, sb])

  useEffect(() => {
    if (!profile || !canAccessAdmin) return
    if (isDetail) fetchRoster()
    else fetchKits()
  }, [profile, canAccessAdmin, isDetail, fetchKits, fetchRoster])

  async function lockKit(id: string) {
    await sb.rpc('lock_uniform_kit', { p_kit_id: id })
    if (isDetail) fetchRoster()
    else fetchKits()
  }

  async function markFulfilled(submissionId: string) {
    await sb.rpc('mark_uniform_submission_fulfilled', { p_submission_id: submissionId })
    fetchRoster()
  }

  function getStatusColor(status: UniformSubmissionStatus): ChipProps['color'] {
    switch (status) {
      case 'fulfilled':
        return 'success'
      case 'locked':
        return 'info'
      case 'submitted':
        return 'warning'
      case 'not_submitted':
      default:
        return 'default'
    }
  }

  function exportCsv(rows: KitRosterRow[]) {
    const allItemNames = Array.from(
      new Set(
        rows
          .flatMap((r) => r.items || [])
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
          .map((i) => i.name),
      ),
    )

    const header = ['Player', 'Status', ...allItemNames].join(',')
    const lines = rows.map((r) => {
      const map = new Map((r.items || []).map((i) => [i.name, i.size ?? '']))
      const cols = [
        `"${r.first_name} ${r.last_name}"`,
        r.submission_status,
        ...allItemNames.map((n) => `"${(map.get(n) || '').replace(/\"/g, '\"\"')}"`),
      ]
      return cols.join(',')
    })
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uniform-kit-${kitId || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function createKit() {
    const items = createItems.map((i) => ({
      name: i.name,
      required: i.required,
      sort_order: i.sort_order,
      size_options: i.size_options,
    }))

    await sb.rpc('create_uniform_kit', {
      p_team_id: createTeamId,
      p_season_id: createSeasonId,
      p_name: createName,
      p_deadline_at: createDeadline ? new Date(createDeadline).toISOString() : null,
      p_items: items,
    })
    setCreateOpen(false)
    fetchKits()
  }

  if (loading && kits.length === 0 && roster.length === 0) {
    return <AdminSkeletonTable rows={10} columns={5} />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {isDetail ? 'Uniform Kit' : 'Uniform Kits'}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          {!isDetail && (
            <>
              <Select
                value={filter}
                onChange={(e: SelectChangeEvent) => setFilter(e.target.value as UniformKitFilter)}
                size="small"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="locked">Locked</MenuItem>
              </Select>
              <Button
                variant="contained"
                onClick={() => {
                  fetchCreateOptions()
                  setCreateOpen(true)
                }}
              >
                Create Kit
              </Button>
            </>
          )}
          {isDetail && (
            <>
              <Button variant="outlined" onClick={() => navigate('/admin/uniforms')}>
                Back
              </Button>
              <Button variant="contained" onClick={() => exportCsv(roster)} disabled={roster.length === 0}>
                Export CSV
              </Button>
              <Button variant="contained" color="warning" onClick={() => lockKit(kitId!)} disabled={roster.length === 0}>
                Lock Kit
              </Button>
            </>
          )}
        </Stack>
      </Box>

      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {isDetail ? (
                  <>
                    <TableCell>Player</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>Kit</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell>Season</TableCell>
                    <TableCell>Deadline</TableCell>
                    <TableCell>Locked</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {(!isDetail && kits.length === 0) || (isDetail && roster.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={isDetail ? 4 : 6} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">No uniforms data found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                (isDetail ? roster : kits).map((row: any) => {
                  if (!isDetail) {
                    const kit = row as UniformKit
                    return (
                      <TableRow key={kit.id} hover>
                        <TableCell>{kit.name}</TableCell>
                        <TableCell>{kit.team?.name}</TableCell>
                        <TableCell>{kit.season?.name}</TableCell>
                        <TableCell>{kit.deadline_at ? new Date(kit.deadline_at).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>{kit.locked_at ? 'Yes' : 'No'}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" variant="outlined" onClick={() => navigate(`/admin/uniforms/${kit.id}`)}>
                              View
                            </Button>
                            <Button size="small" color="warning" variant="contained" onClick={() => lockKit(kit.id)} disabled={!!kit.locked_at}>
                              Lock
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  }

                  const r = row as KitRosterRow
                  return (
                    <TableRow key={r.child_id} hover>
                      <TableCell>
                        {r.first_name} {r.last_name}
                      </TableCell>
                      <TableCell>
                        <Chip label={r.submission_status.replace('_', ' ')} color={getStatusColor(r.submission_status)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {(r.items || []).map((it) => (
                            <Chip key={it.item_id} label={`${it.name}: ${it.size ?? '—'}`} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={!r.submission_id || r.submission_status === 'fulfilled'}
                          onClick={() => r.submission_id && markFulfilled(r.submission_id)}
                        >
                          Mark Fulfilled
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {!isDetail && (
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10))
              setPage(0)
            }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        )}
      </Card>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Uniform Kit</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Kit name" value={createName} onChange={(e) => setCreateName(e.target.value)} fullWidth />
            <TextField
              label="Deadline (optional)"
              type="date"
              value={createDeadline}
              onChange={(e) => setCreateDeadline(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              label="Team"
              value={createTeamId}
              onChange={(e) => setCreateTeamId(e.target.value)}
              fullWidth
            >
              {teamOptions.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.team.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Season"
              value={createSeasonId}
              onChange={(e) => setCreateSeasonId(e.target.value)}
              fullWidth
            >
              {seasonOptions.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>

            <Typography variant="subtitle2">Items (comma-separated size options)</Typography>
            {createItems.map((it, idx) => (
              <Box key={`${it.name}-${idx}`} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Stack spacing={1}>
                  <TextField
                    label="Item name"
                    value={it.name}
                    onChange={(e) => {
                      const next = [...createItems]
                      next[idx] = { ...next[idx], name: e.target.value }
                      setCreateItems(next)
                    }}
                    fullWidth
                  />
                  <TextField
                    label="Size options"
                    value={it.size_options.join(', ')}
                    onChange={(e) => {
                      const next = [...createItems]
                      next[idx] = {
                        ...next[idx],
                        size_options: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }
                      setCreateItems(next)
                    }}
                    fullWidth
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createKit}
            disabled={!createTeamId || !createSeasonId || !createName.trim() || createItems.some((i) => !i.name.trim())}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
