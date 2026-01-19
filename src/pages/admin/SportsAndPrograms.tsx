/**
 * Sports & Programs Management
 *
 * Master-detail view for sports and programs with contextual actions.
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getSports, getPrograms } from '../../data/services/sportsService'
import type { Sport, Program } from '../../data/types/organization'
import { OrganizationStructurePageHeader } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'

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
        const [sportsResult, programsResult] = await Promise.all([
          getSports(context), 
          getPrograms(context)
        ])

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

  // --- Components ---

  const PrimaryButton = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <button className={`inline-flex items-center justify-center h-10 px-6 font-medium text-sm text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 ${className}`}>
      {children}
    </button>
  )

  const SecondaryButton = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <button className={`inline-flex items-center justify-center h-9 px-4 font-medium text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-200 ${className}`}>
      {children}
    </button>
  )

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2 mb-12"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <OrganizationStructurePageHeader
          title="Sports & Programs"
          subtitle="Define the sports your organization offers and the specific programs within them."
          pageName="Sports & Programs"
        />
        <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <OfflineBanner />
      <OrganizationStructurePageHeader
        title="Sports & Programs"
        subtitle="Define the sports your organization offers and the specific programs within them."
        pageName="Sports & Programs"
        actions={
          <Link to="/admin/organization/structure/forms?type=sport">
            <PrimaryButton>Add Sport</PrimaryButton>
          </Link>
        }
      />

      <div className="flex flex-col gap-4">
        {sports.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">sports</span>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No sports yet</h3>
            <p className="text-slate-500 mb-6">Start by adding your first sport to the platform.</p>
            <Link to="/admin/organization/structure/forms?type=sport">
              <PrimaryButton>Add Sport</PrimaryButton>
            </Link>
          </div>
        ) : (
          sports.map((sport) => {
            const sportPrograms = programsBySport(sport.id)
            const isExpanded = expandedSportId === sport.id

            return (
              <div 
                key={sport.id} 
                className={`group bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md ${isExpanded ? 'ring-1 ring-slate-200 shadow-md' : ''}`}
              >
                {/* Sport Header */}
                <div
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => toggleSportExpand(sport.id)}
                >
                  <div className="flex items-center gap-4">
                    <span 
                      className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-slate-600' : ''}`}
                    >
                      expand_more
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        {sport.name}
                      </h3>
                      <p className="text-sm font-medium text-slate-400 mt-0.5">
                        {sportPrograms.length} {sportPrograms.length === 1 ? 'program' : 'programs'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <Link to={`/admin/organization/structure/forms?edit=sport&id=${sport.id}`}>
                      <SecondaryButton>Edit</SecondaryButton>
                    </Link>
                    <Link to={`/admin/organization/structure/forms?type=program`}>
                      <SecondaryButton>Add Program</SecondaryButton>
                    </Link>
                  </div>
                </div>

                {/* Expanded Programs List */}
                {isExpanded && (
                  <div className="bg-slate-50/50 border-t border-slate-100 p-4 pl-14 sm:pl-16 space-y-3 pb-6">
                    {sportPrograms.length > 0 ? (
                      sportPrograms.map((program) => (
                        <div 
                          key={program.id} 
                          className="flex items-center justify-between p-4 bg-white border border-slate-200/60 rounded-lg shadow-sm hover:border-slate-300 transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">{program.name}</div>
                            <div className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">
                              {program.gender_category}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/organization/structure/forms?edit=program&id=${program.id}`}>
                              <SecondaryButton>Edit</SecondaryButton>
                            </Link>
                            <Link to={`/admin/organization/structure/forms?type=level`}>
                              <SecondaryButton>Add Level</SecondaryButton>
                            </Link>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg bg-white/50">
                        <p className="text-sm text-slate-500 mb-3">No programs found for {sport.name}.</p>
                        <Link to={`/admin/organization/structure/forms?type=program`}>
                          <button className="text-sm font-semibold text-slate-900 hover:underline">
                            Create a Program
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
