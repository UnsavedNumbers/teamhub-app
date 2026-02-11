import { useState, useEffect } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, Button, Input, Badge } from '../../../components/platformAdmin'
import { showSuccess, showError } from '../../../utils/toast'
import { 
  getOrganizationTravelContacts, 
  upsertOrganizationTravelContact 
} from '../../../data/services/organizationTravelContactsService'
import { 
  TRAVEL_CONTACT_CATEGORIES_ORG, 
  type TravelContactCategoryOrg 
} from '../../../types/travelContacts'
import { useUserContext } from '../../../hooks/useUserContext'

// Schema for a single category row
const contactRowSchema = z.object({
  category: z.enum(TRAVEL_CONTACT_CATEGORIES_ORG),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email().or(z.literal('')),
  phone: z.string().optional().nullable(),
})

// Schema for the form
const contactFormSchema = z.object({
  contacts: z.array(contactRowSchema),
})

type ContactFormData = z.infer<typeof contactFormSchema>

const CATEGORY_LABELS: Record<TravelContactCategoryOrg, string> = {
  transportation: 'Transportation',
  lodging: 'Lodging',
  venue: 'Venue / On-site Contact',
  emergency: 'Emergency',
  general: 'General Travel Contact',
  default: 'Default / Fallback',
}

const CATEGORY_DESCRIPTIONS: Record<TravelContactCategoryOrg, string> = {
  transportation: 'Bus, flight, or excessive travel coordination.',
  lodging: 'Hotel and room block management.',
  venue: 'Contact at the venue (e.g. facility manager).',
  emergency: 'Urgent issues during the trip.',
  general: 'General trip questions.',
  default: 'Used when a specific category has no contact.',
}

export default function TravelContactSection() {
  const { context } = useUserContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const { control, handleSubmit, reset } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      contacts: [],
    }
  })

  const { fields } = useFieldArray({
    control,
    name: 'contacts',
  })

  useEffect(() => {
    if (context) {
        loadData()
    }
  }, [context])

  const loadData = async () => {
    if (!context) return
    setLoading(true)
    try {
      const { data, error } = await getOrganizationTravelContacts(context)
      if (error) throw error
      
      // Map to form shape, ensuring all categories exist
      const contacts = TRAVEL_CONTACT_CATEGORIES_ORG.map(cat => {
        const existing = data[cat]
        return {
          category: cat,
          first_name: existing?.first_name || '',
          last_name: existing?.last_name || '',
          email: existing?.email || '',
          phone: existing?.phone || '',
        }
      })
      
      // Sort: Default first, then others
      // Actually plan order: Transportation, Lodging, Venue, Emergency, General, Default?
      // Plan §2 says "For each category (Transportation, Lodging, Venue / On-site, Emergency, General, Default)"
      const orderedStats = contacts.sort((a, b) => {
        const order = ['transportation', 'lodging', 'venue', 'emergency', 'general', 'default']
        return order.indexOf(a.category) - order.indexOf(b.category)
      })

      reset({ contacts: orderedStats })
    } catch (err) {
      showError('Failed to load travel contacts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ContactFormData) => {
    if (!context) return
    setSaving(true)
    try {
      // Validate: if any field is set, email is required
      for (const contact of data.contacts) {
         const hasName = contact.first_name || contact.last_name
         const hasEmail = !!contact.email
         
         if (hasName && !hasEmail) {
             throw new Error(`Email is required for ${CATEGORY_LABELS[contact.category]} if name is provided.`)
         }
      }

      await Promise.all(data.contacts.map(async (contact) => {
          // Only save if dirty? Or just save all? Save all is safer for consistency.
          // In DB, empty strings are allowed.
          return upsertOrganizationTravelContact(context, contact.category, {
              first_name: contact.first_name,
              last_name: contact.last_name,
              email: contact.email,
              phone: contact.phone || null,
          })
      }))

      showSuccess('Travel contacts updated successfully')
      loadData() 
      
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save contacts')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
      return <div className="oa-p-8 oa-text-center">Loading travel contacts...</div>
  }

  return (
    <div className="oa-contact-section">
      <Card title="Organization Travel Contacts" className="oa-mb-6">
        <p className="oa-text-sm oa-text-muted oa-mb-6">
            Manage fallback contacts for travel plans. Travel plans will use these contacts unless specific overrides are set on the plan itself.
        </p>
        
        <div className="oa-category-list oa-flex oa-flex-col oa-gap-6">
            {fields.map((field, index) => {
                const label = CATEGORY_LABELS[field.category]
                const desc = CATEGORY_DESCRIPTIONS[field.category]
                
                return (
                    <div key={field.id} className="oa-category-row oa-p-4 oa-border oa-rounded-lg oa-bg-gray-50 dark:oa-bg-gray-900/50">
                        <div className="oa-mb-3">
                            <h4 className="oa-h4 oa-mb-1 oa-flex oa-items-center oa-gap-2">
                                {label}
                                {field.category === 'default' && <Badge variant="primary" size="small">Fallback</Badge>}
                            </h4>
                            <p className="oa-text-xs oa-text-muted">{desc}</p>
                        </div>

                        <div className="oa-contact-form-grid oa-grid oa-grid-cols-1 md:oa-grid-cols-2 oa-gap-4">
                            <Controller
                                control={control}
                                name={`contacts.${index}.first_name`}
                                render={({ field: inputField, fieldState }) => (
                                    <Input {...inputField} label="First Name" error={fieldState.error?.message} />
                                )}
                            />
                            <Controller
                                control={control}
                                name={`contacts.${index}.last_name`}
                                render={({ field: inputField, fieldState }) => (
                                    <Input {...inputField} label="Last Name" error={fieldState.error?.message} />
                                )}
                            />
                            <Controller
                                control={control}
                                name={`contacts.${index}.email`}
                                render={({ field: inputField, fieldState }) => (
                                    <Input {...inputField} label="Email" type="email" error={fieldState.error?.message} />
                                )}
                            />
                            <Controller
                                control={control}
                                name={`contacts.${index}.phone`}
                                render={({ field: inputField }) => (
                                    <Input {...inputField} value={inputField.value || ''} label="Phone" type="tel" />
                                )}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
      </Card>

      <div className="oa-form-actions">
          <Button onClick={handleSubmit(onSubmit)} loading={saving} variant="primary">
              Save Travel Contacts
          </Button>
      </div>
    </div>
  )
}
