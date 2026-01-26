import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getUniformKits, getUniformSubmissions, getUniformKitItems, type UniformKit, type UniformItem } from '../data/services/uniformsService'
import { getAthletes } from '../data/services/familyService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { useT } from '../i18n/useI18n'
import { getLink } from '../utils/routes'

interface Child {
  id: string
  first_name: string
  last_name: string
}

export default function Uniforms() {
  const t = useT()
  const navigate = useNavigate()
  const [children, setChildren] = useState<Child[]>([])
  const [kits, setKits] = useState<UniformKit[]>([])
  const [kitItems, setKitItems] = useState<Record<string, UniformItem[]>>({})
  const [loading, setLoading] = useState(true)

  const { context, isReady } = useUserContext()

  const fetchData = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    
    // Fetch children
    const { data: childData } = await getAthletes(context)
    setChildren(childData.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
    })))

    // Fetch uniform kits
    const { data: kitsData } = await getUniformKits(context)
    setKits(kitsData)

    // Fetch items for all kits
    if (kitsData.length > 0) {
      const kitIds = kitsData.map(k => k.id)
      const { data: itemsData } = await getUniformKitItems(context, kitIds)
      
      // Group items by kit_id
      const itemsByKit: Record<string, UniformItem[]> = {}
      itemsData.forEach(item => {
        if (!itemsByKit[item.kit_id]) {
          itemsByKit[item.kit_id] = []
        }
        itemsByKit[item.kit_id].push(item)
      })
      setKitItems(itemsByKit)
    }

    // Fetch uniform submissions to show status
    await getUniformSubmissions(context)

    setLoading(false)
  }, [context, isReady])

  useEffect(() => {
    if (isReady) fetchData()
    else setLoading(false)
  }, [isReady, fetchData])

  return (
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
            <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.uniforms.addChildrenFirst')}</p>
            <Link to="/portal/athletes">
              <Button variant="primary">
                {t('portal.uniforms.add')}
              </Button>
            </Link>
          </Card>
        ) : kits.length === 0 ? (
          <Card className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
              <Icon name="checkroom" size="text-4xl" className="text-slate-400" />
            </div>
            <CardTitle className="mb-2">No uniform kits available</CardTitle>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Uniform ordering will be available when your team creates uniform kits.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {kits.map((kit) => (
              <Card key={kit.id} className="p-0 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          kit.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          kit.status === 'ordering' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {kit.status}
                        </span>
                        {kit.vendor_name && (
                          <span className="text-xs font-medium text-slate-500">{kit.vendor_name}</span>
                        )}
                      </div>
                      <CardTitle className="mb-2">{kit.name}</CardTitle>
                      {kit.description && <p className="text-slate-500 dark:text-slate-400">{kit.description}</p>}
                    </div>
                    {kit.deadline && (
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Deadline</p>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {new Date(kit.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6">
                   <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Required Items</p>
                   {kitItems[kit.id] && kitItems[kit.id].length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                       {kitItems[kit.id]
                         .filter(item => item.required)
                         .map((item) => (
                           <span key={item.id} className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-700 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-600">
                             <Icon name="checkroom" size="text-sm" /> {item.name}
                           </span>
                         ))}
                     </div>
                   ) : (
                     <p className="text-sm text-slate-500 dark:text-slate-400">No items configured for this kit.</p>
                   )}
                   
                   <div className="mt-6 flex justify-end">
                      <Button 
                        variant="primary"
                        onClick={() => navigate(getLink('portal.uniformKitDetail', { kitId: kit.id }))}
                      >
                        View & Order
                      </Button>
                   </div>
                </div>
              </Card>
            ))}

            <Card className="mt-10 p-6 border-t-4 border-[var(--org-btn-primary-bg, #137fec)]">
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
          </div>
        )}
      </PortalLayout>
  )
}
