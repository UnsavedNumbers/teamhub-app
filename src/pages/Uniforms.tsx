import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getUniformKits, getUniformSubmissions, getUniformKitItems, type UniformKit, type UniformItem } from '../data/services/uniformsService'
import { getContactForCategory } from '../data/services/organizationContactsService'
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

import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'

export default function Uniforms() {
  useDebugLifecycle('Uniforms')
  
  const t = useT()
  const navigate = useNavigate()
  const [children, setChildren] = useState<Child[]>([])
  const [kits, setKits] = useState<UniformKit[]>([])
  const [kitItems, setKitItems] = useState<Record<string, UniformItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [uniformContact, setUniformContact] = useState<{ name: string; email: string; phone?: string | null } | null>(null)

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

    // Fetch uniform contact
    try {
        const { data: contact } = await getContactForCategory(context.orgId, 'uniforms')
        if (contact) {
            setUniformContact({
                name: `${contact.first_name} ${contact.last_name}`,
                email: contact.email,
                phone: contact.phone
            })
        }
    } catch (err) {
        console.warn('Failed to fetch uniform contact', err)
    }

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
        <div className="mb-8 sm:mb-12">
          <PageTitle>Uniforms</PageTitle>
          <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-light tracking-wide">
            Submit uniform sizes for your athletes.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : children.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-6">{t('portal.uniforms.addChildrenFirst')}</p>
            <Link to="/portal/athletes">
              <Button variant="primary">
                {t('portal.uniforms.add')}
              </Button>
            </Link>
          </Card>
        ) : kits.length === 0 ? (
          <Card className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Icon name="checkroom" size="text-4xl" className="text-gray-400" />
            </div>
            <CardTitle className="mb-2">No uniform kits available</CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Uniform ordering will be available when your team creates uniform kits.
            </p>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {kits.map((kit) => (
              <Card key={kit.id} className="p-0 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          kit.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          kit.status === 'ordering' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {kit.status}
                        </span>
                        {kit.vendor_name && (
                          <span className="text-xs font-medium text-gray-500">{kit.vendor_name}</span>
                        )}
                      </div>
                      <CardTitle className="mb-2 break-words">{kit.name}</CardTitle>
                      {kit.description && <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 break-words">{kit.description}</p>}
                    </div>
                    {kit.deadline && (
                      <div className="text-left sm:text-right flex-shrink-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Deadline</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {new Date(kit.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6">
                   <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 sm:mb-4">Required Items</p>
                   {kitItems[kit.id] && kitItems[kit.id].length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                       {kitItems[kit.id]
                         .filter(item => item.required)
                         .map((item) => (
                           <span key={item.id} className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-700 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-600">
                             <Icon name="checkroom" size="text-sm" /> {item.name}
                           </span>
                         ))}
                     </div>
                   ) : (
                     <p className="text-sm text-gray-500 dark:text-gray-400">No items configured for this kit.</p>
                   )}
                   
                   <div className="mt-4 sm:mt-6 flex justify-end">
                      <Button 
                        variant="primary"
                        onClick={() => navigate(getLink('portal.uniformKitDetail', { kitId: kit.id }))}
                        className="w-full sm:w-auto"
                      >
                        View & Order
                      </Button>
                   </div>
                </div>
              </Card>
            ))}

            <Card className="mt-8 sm:mt-10 p-4 sm:p-6 border-t-4 border-[var(--org-btn-primary-bg, #137fec)]">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Icon name="help" size="text-3xl sm:text-4xl" className="text-gray-400 flex-shrink-0" />
                  <div>
                    <CardTitle className="text-base sm:text-lg mb-1">Need sizing help</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">View our youth fit guide for accurate measurements.</p>
                  </div>
                </div>
                <Button variant="secondary" className="border-2 w-full md:w-auto">
                  Open Fit Guide
                </Button>
              </div>
            </Card>

            {uniformContact && (
              <Card className="mt-4 p-4 sm:p-6 border-l-4 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <Icon name="support" size="text-3xl sm:text-4xl" className="text-gray-400 flex-shrink-0" />
                        <div>
                            <CardTitle className="text-base sm:text-lg mb-1">Uniform Questions?</CardTitle>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Contact <span className="font-bold text-gray-900 dark:text-white">{uniformContact.name}</span>
                            </p>
                            <div className="flex flex-col sm:flex-row gap-x-4 gap-y-1 mt-1">
                                <a href={`mailto:${uniformContact.email}`} className="text-sm font-bold text-[var(--org-link-color)] hover:underline flex items-center gap-1">
                                    <Icon name="email" size="text-xs" /> {uniformContact.email}
                                </a>
                                {uniformContact.phone && (
                                    <a href={`tel:${uniformContact.phone}`} className="text-sm font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                        <Icon name="phone" size="text-xs" /> {uniformContact.phone}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                 </div>
              </Card>
            )}
          </div>
        )}
      </PortalLayout>
  )
}

