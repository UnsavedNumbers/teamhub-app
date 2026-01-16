import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserContext } from '../hooks/useUserContext'
import { getUniformSubmissions } from '../data/services/uniformsService'
import { getChildren } from '../data/services/familyService'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

interface Child {
  id: string
  first_name: string
  last_name: string
}

export default function Uniforms() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  const { profile } = useAuth()
  const { context, isReady } = useUserContext()

  const fetchData = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    
    // Fetch children
    const { data: childData } = await getChildren(context)
    setChildren(childData.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
    })))

    // Fetch uniform submissions (currently returns empty array)
    await getUniformSubmissions(context)

    setLoading(false)
  }, [context, isReady])

  useEffect(() => {
    if (isReady) fetchData()
    else setLoading(false)
  }, [isReady, fetchData])

  return (
    <>
      <PortalHeader />
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Uniforms' },
        ]}
      >
        <div className="mb-12">
          <PageTitle>Uniforms</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
            Submit uniform sizes for your athletes.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : children.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 mb-6">Add children first to manage uniforms.</p>
            <Button variant="primary" as={Link} to="/portal/children">
              Add
            </Button>
          </Card>
        ) : (
          <>
            <Card className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                <Icon name="checkroom" size="text-4xl" className="text-slate-400" />
              </div>
              <CardTitle className="mb-2">No uniform kits available</CardTitle>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Uniform ordering will be available when your team creates uniform kits.
              </p>
            </Card>

            <Card className="mt-10 p-6 border-t-4 border-[#137fec]">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Icon name="help" size="text-4xl" className="text-slate-400" />
                  <div>
                    <CardTitle className="text-lg mb-1">Need sizing help</CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View our youth fit guide for accurate measurements.</p>
                  </div>
                </div>
                <Button variant="secondary" className="border-2">
                  Open Fit Guide
                </Button>
              </div>
            </Card>
          </>
        )}
      </PortalLayout>
    </>
  )
}
