import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getChildren } from '../data/services/familyService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { useT } from '../i18n/useI18n'

interface Child {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
}

export default function Athletes() {
  const t = useT()
  const navigate = useNavigate()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)


  const { context, isReady } = useUserContext()

  const fetchAthletes = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    const { data, error } = await getChildren(context)

    if (!error) {
      setChildren(data.map(child => ({
        id: child.id,
        first_name: child.first_name,
        last_name: child.last_name,
        date_of_birth: child.date_of_birth,
      })))
    }
    setLoading(false)
  }, [context, isReady])

  useEffect(() => {
    if (isReady) fetchAthletes()
    else setLoading(false)
  }, [isReady, fetchAthletes])

  function calculateAge(birthdate: string | null) {
    if (!birthdate) return null
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Teams' },
        ]}
      >
        <div className="mb-12 flex items-end justify-between">
          <div>
            <PageTitle>Teams</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
              Manage your children's team memberships.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/portal/athletes/new')}>
            Add
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : children.length === 0 ? (
          <Card className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
              <Icon name="group" size="text-4xl" className="text-slate-400" />
            </div>
            <CardTitle className="mb-2">{t('portal.children.noChildren')}</CardTitle>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.children.addChildren')}</p>
            <Button variant="primary" onClick={() => navigate('/portal/athletes/new')}>
              {t('portal.children.add')}
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Card key={child.id} className="p-6 hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#137fec]/20 rounded-full flex items-center justify-center">
                    <span className="text-lg font-black text-[#137fec]">{child.first_name[0]}</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg mb-1">{child.first_name} {child.last_name}</CardTitle>
                    {child.date_of_birth && (
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        Age {calculateAge(child.date_of_birth)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PortalLayout>
  )
}
