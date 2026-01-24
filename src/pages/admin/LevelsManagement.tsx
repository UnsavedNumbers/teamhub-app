/**
 * Levels Management
 *
 * Table view with filtering and contextual creation.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getLevels } from '../../data/services/levelsService'
import { getPrograms } from '../../data/services/sportsService'
import type { Level, Program } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Select } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'

export default function LevelsManagement() {
  const { context, isReady } = useUserContext()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [levels, setLevels] = useState<Level[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [filterProgramId, setFilterProgramId] = useState<string>('')

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [levelsResult, programsResult] = await Promise.all([getLevels(context), getPrograms(context)])

        setLevels(Array.isArray(levelsResult.data) ? levelsResult.data : [])
        setPrograms(Array.isArray(programsResult.data) ? programsResult.data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  const programById = new Map(programs.map((p) => [p.id, p]))
  const filteredLevels = filterProgramId ? levels.filter((l) => l.program_id === filterProgramId) : levels
  const canCreateLevel = programs.length > 0

  const levelTypeLabel = (type: string) => {
    switch (type) {
      case 'age_based':
        return 'Age-based'
      case 'grade_based':
        return 'Grade-based'
      case 'skill_based':
        return 'Skill-based'
      default:
        return type
    }
  }

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  return (
    <div className="pa-root">
      <OfflineBanner />
      <AdminPageHeader
        title="Levels"
        subtitle="Define eligibility boundaries (age, grade, or skill)"
        breadcrumbs={[
          { label: 'Organizations', path: '/admin/organization/structure' },
          { label: 'Levels' },
        ]}
      />

      {error && (
        <Card className="pa-mb-4">
          <div className="pa-text-danger">{error}</div>
        </Card>
      )}

      {levels.length === 0 ? (
        <Card>
          <div className="pa-flex pa-flex-col pa-items-center pa-justify-center pa-text-center pa-p-6">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n300)', marginBottom: '16px' }}>
              grade
            </span>
            <h3 className="pa-h3">No levels yet</h3>
            <p className="pa-body-m pa-text-muted pa-mb-4">Create programs first, then add levels to define eligibility.</p>
            <Link to="/admin/organization/structure/forms?type=program">
              <Button>Add a Program</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <Card className="pa-mb-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="w-full md:w-auto md:min-w-[200px]">
                <Select
                  label="Filter by program"
                  value={filterProgramId}
                  onChange={(e) => setFilterProgramId(e.target.value)}
                  options={[
                    { value: '', label: 'All programs' },
                    ...programs.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </div>
              <Link to="/admin/organization/structure/forms?type=level" className="w-full md:w-auto">
                <Button style={{ width: '100%' }} disabled={!canCreateLevel} title={!canCreateLevel ? 'Add a Program first' : undefined}>
                  Add Level
                </Button>
              </Link>
            </div>
          </Card>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Level Name</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Program</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Eligibility</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLevels.map((level) => {
                    const program = programById.get(level.program_id)
                    const eligibility = level.age_min && level.age_max ? `${level.age_min}-${level.age_max} years` : level.grade_min && level.grade_max ? `Grades ${level.grade_min}-${level.grade_max}` : level.description || '—'

                    return (
                      <tr key={level.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{level.name}</div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-700">{program?.name || '—'}</td>
                        <td className="py-4 px-6 text-sm text-slate-500">{levelTypeLabel(level.level_type)}</td>
                        <td className="py-4 px-6 text-sm text-slate-500">{eligibility}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              level.deleted_at
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}
                          >
                            {level.deleted_at ? 'Archived' : 'Active'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link to={`/admin/organization/structure/forms?edit=level&id=${level.id}`} className="invisible group-hover:visible focus:visible">
                            <button className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                              Edit
                            </button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
