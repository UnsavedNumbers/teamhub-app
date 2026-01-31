import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getTryoutById } from '../data/services/tryoutsService'
import type { Tryout } from '../data/services/tryoutsService'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'

export default function TryoutDetail() {
  const { tryoutId } = useParams<{ tryoutId: string }>()
  const [loading, setLoading] = useState(true)
  const [tryout, setTryout] = useState<Tryout | null>(null)
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    if (!isReady || !tryoutId) return
    setLoading(true)
    const { data } = await getTryoutById(context, tryoutId)
    setTryout(data)
    setLoading(false)
  }, [context, isReady, tryoutId])

  useEffect(() => {
    if (isReady) fetchData()
  }, [isReady, fetchData])

  if (loading) {
    return (
      <>
        <PortalHeader />
        <PortalLayout>
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        </PortalLayout>
      </>
    )
  }

  if (!tryout) {
    return (
      <>
        <PortalHeader />
        <PortalLayout>
          <Card className="text-center py-12">
            <CardTitle>Tryout not found</CardTitle>
            <Button variant="primary" onClick={() => navigate('/portal/tryouts')} className="mt-4">
              Back to Tryouts
            </Button>
          </Card>
        </PortalLayout>
      </>
    )
  }

  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Tryouts', path: '/portal/tryouts' },
          { label: tryout.title },
        ]}
      >
        <div className="mb-12">
          <PageTitle>{tryout.title}</PageTitle>
        </div>

        <Card className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Date</label>
                  <p className="font-bold">{new Date(tryout.tryout_date || '').toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Location</label>
                  <p className="font-bold">{tryout.location}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Age Group</label>
                  <p className="font-bold">{tryout.age_group}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Entry Fee</label>
                  <p className="font-bold">${((tryout.entry_fee || 0)/100).toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Description</h3>
              <p className="text-slate-600 dark:text-slate-300">{tryout.description || 'No description provided.'}</p>
            </div>
          </div>
        </Card>
      </PortalLayout>
  )
}
