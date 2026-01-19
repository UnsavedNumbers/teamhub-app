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

        setLevels(levelsResult.data as Level[])
        setPrograms(programsResult.data as Program[])
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
            <div className="pa-flex pa-justify-between pa-items-center">
              <Select
                label="Filter by program"
                value={filterProgramId}
                onChange={(e) => setFilterProgramId(e.target.value)}
                options={[
                  { value: '', label: 'All programs' },
                  ...programs.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <Link to="/admin/organization/structure/forms?type=level">
                <Button>Add Level</Button>
              </Link>
            </div>
          </Card>

          <Card noPadding>
            <table className="pa-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th className="pa-p-4">Level Name</th>
                  <th className="pa-p-4">Program</th>
                  <th className="pa-p-4">Type</th>
                  <th className="pa-p-4">Eligibility</th>
                  <th className="pa-p-4">Status</th>
                  <th className="pa-p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLevels.map((level) => {
                  const program = programById.get(level.program_id)
                  const eligibility = level.age_min && level.age_max ? `${level.age_min}-${level.age_max} years` : level.grade_min && level.grade_max ? `Grades ${level.grade_min}-${level.grade_max}` : level.description || '—'

                  return (
                    <tr key={level.id} style={{ borderTop: '1px solid var(--pa-n200)' }}>
                      <td className="pa-p-4 pa-font-medium">{level.name}</td>
                      <td className="pa-p-4 pa-text-muted">{program?.name || '—'}</td>
                      <td className="pa-p-4 pa-text-muted">{levelTypeLabel(level.level_type)}</td>
                      <td className="pa-p-4 pa-text-muted">{eligibility}</td>
                      <td className="pa-p-4">
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: level.deleted_at ? 'var(--pa-n200)' : 'var(--pa-success-bg)',
                            color: level.deleted_at ? 'var(--pa-n600)' : 'var(--pa-success)',
                          }}
                        >
                          {level.deleted_at ? 'Archived' : 'Active'}
                        </span>
                      </td>
                      <td className="pa-p-4">
                        <Link to={`/admin/organization/structure/forms?edit=level&id=${level.id}`}>
                          <Button variant="secondary">
                            Edit
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
