/**
 * Sports & Programs Management
 *
 * Master-detail view for sports and programs with contextual actions.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getSports, getPrograms } from '../../data/services/sportsService'
import type { Sport, Program } from '../../data/types/organization'
import { PageHeader, Card, Button } from '../../components/platformAdmin'
import { Breadcrumbs } from '../../components/admin/Breadcrumbs'

export default function SportsAndPrograms() {
  const { context, isReady } = useUserContext()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [expandedSportId, setExpandedSportId] = useState<string | null>(null)

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [sportsResult, programsResult] = await Promise.all([getSports(context), getPrograms(context)])

        setSports(sportsResult.data as Sport[])
        setPrograms(programsResult.data as Program[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  const programsBySport = (sportId: string) => programs.filter((p) => p.sport_id === sportId)

  const toggleSportExpand = (sportId: string) => {
    setExpandedSportId(expandedSportId === sportId ? null : sportId)
  }

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  if (error) {
    return (
      <div className="pa-root">
        <PageHeader title="Sports & Programs" />
        <Card>
          <div className="pa-text-danger">{error}</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <PageHeader title="Sports & Programs" subtitle="Define sports and gender-specific programs" />

      <Breadcrumbs
        items={[
          { label: 'Organization Structure', path: '/admin/organization/structure' },
          { label: 'Sports & Programs' },
        ]}
      />

      {sports.length === 0 ? (
        <Card>
          <div className="pa-flex pa-flex-col pa-items-center pa-justify-center pa-text-center pa-p-6">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n300)', marginBottom: '16px' }}>
              sports
            </span>
            <h3 className="pa-h3">No sports yet</h3>
            <p className="pa-body-m pa-text-muted pa-mb-4">Start by adding your first sport.</p>
            <Link to="/admin/organization/structure/sports/new">
              <Button>Add Sport</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="pa-flex pa-justify-end pa-mb-4">
            <Link to="/admin/organization/structure/sports/new">
              <Button>Add Sport</Button>
            </Link>
          </div>

          <div className="pa-flex pa-flex-col pa-gap-3">
            {sports.map((sport) => {
              const sportPrograms = programsBySport(sport.id)
              const isExpanded = expandedSportId === sport.id

              return (
                <Card key={sport.id} noPadding>
                  <div
                    className="pa-p-4 pa-cursor-pointer pa-flex pa-items-center pa-justify-between pa-hover"
                    onClick={() => toggleSportExpand(sport.id)}
                  >
                    <div className="pa-flex pa-items-center pa-gap-3">
                      <span className="material-symbols-outlined">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                      <div>
                        <div className="pa-body-m pa-font-bold">{sport.name}</div>
                        <div className="pa-body-s pa-text-muted">{sportPrograms.length} program(s)</div>
                      </div>
                    </div>
                    <div className="pa-flex pa-items-center pa-gap-2">
                      <Link to={`/admin/organization/structure/sports/${sport.id}/edit`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="secondary">
                          Edit
                        </Button>
                      </Link>
                      <Link
                        to={`/admin/organization/structure/programs/new?sport_id=${sport.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="secondary">
                          Add Program
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {isExpanded && sportPrograms.length > 0 && (
                    <div className="pa-p-4 pa-border-t" style={{ borderColor: 'var(--pa-n200)' }}>
                      <div className="pa-flex pa-flex-col pa-gap-2">
                        {sportPrograms.map((program) => (
                          <div key={program.id} className="pa-flex pa-items-center pa-justify-between pa-p-3" style={{ backgroundColor: 'var(--pa-n50)', borderRadius: '6px' }}>
                            <div>
                              <div className="pa-body-m pa-font-medium">{program.name}</div>
                              <div className="pa-body-s pa-text-muted">{program.gender_category}</div>
                            </div>
                            <div className="pa-flex pa-items-center pa-gap-2">
                              <Link to={`/admin/organization/structure/programs/${program.id}/edit`}>
                                <Button variant="secondary">
                                  Edit
                                </Button>
                              </Link>
                              <Link to={`/admin/organization/structure/levels/new?program_id=${program.id}`}>
                                <Button variant="secondary">
                                  Add Level
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isExpanded && sportPrograms.length === 0 && (
                    <div className="pa-p-4 pa-border-t" style={{ borderColor: 'var(--pa-n200)', color: 'var(--pa-n500)' }}>
                      <p className="pa-body-s">No programs yet. Add a gender-specific program to this sport.</p>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
