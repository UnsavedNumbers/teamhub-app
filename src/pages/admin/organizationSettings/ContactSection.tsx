
import { useState, useEffect, Fragment } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, Button, Input, Switch } from '../../../components/platformAdmin'
import { showSuccess, showError } from '../../../utils/toast'
import { 
  getOrganizationContacts, 
  upsertDefaultContact, 
  upsertCategoryContact 
} from '../../../data/services/organizationContactsService'
import { useUserContext } from '../../../hooks/useUserContext'
import { 
  getOrganizationTravelContacts,
  upsertOrganizationTravelContact,
} from '../../../data/services/organizationTravelContactsService'
import { TRAVEL_CONTACT_CATEGORIES_ORG, type TravelContactCategoryOrg } from '../../../types/travelContacts'
import { 
  CONTACT_CATEGORIES, 
  type ContactCategory,
  defaultContactSchema 
} from '../../../types/organizationContacts'

// Schema for a single category row in the form
const subContactSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
})

const travelContactsSchema = z.object({
  transportation: subContactSchema.optional(),
  lodging: subContactSchema.optional(),
  venue: subContactSchema.optional(),
  emergency: subContactSchema.optional(),
}).optional()

const categoryRowSchema = z.object({
  category: z.enum(CONTACT_CATEGORIES),
  is_custom: z.boolean(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  travel_contacts: travelContactsSchema,
})

// Schema for the entire form
const contactFormSchema = z.object({
  defaultContact: defaultContactSchema.omit({ is_custom: true }).extend({
    is_custom: z.literal(true),
  }),
  categories: z.array(categoryRowSchema),
})

type ContactFormData = z.infer<typeof contactFormSchema>

export default function ContactSection({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const { control, handleSubmit, reset, watch } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      defaultContact: {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        is_custom: true as const,
      },
      categories: CONTACT_CATEGORIES
        .filter(c => c !== 'default')
        .map(c => ({
          category: c,
          is_custom: false,
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          travel_contacts: c === 'travel' ? {
            transportation: { first_name: '', last_name: '', email: '', phone: '' },
            lodging: { first_name: '', last_name: '', email: '', phone: '' },
            venue: { first_name: '', last_name: '', email: '', phone: '' },
            emergency: { first_name: '', last_name: '', email: '', phone: '' },
          } : undefined,
        })),
    }
  })

  // Watch default contact to update previews if needed (though requirement says "Saved" default contact is used for fallback display)
  // Actually requirement says: "Toggle OFF: show preview of default contact... do not clear stored category contact data."
  // For the preview, we might want the *server* default contact, but using the *current form* default contact is better UX.
  const watchedDefault = watch('defaultContact')

  const { fields } = useFieldArray({
    control,
    name: 'categories',
  })

  const { context } = useUserContext()

  useEffect(() => {
    loadData()
  }, [orgId])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data, error } = await getOrganizationContacts(orgId)
      if (error) throw error
      
      const defaultContact = data?.find(c => c.category === 'default')
      const categoryContacts = data?.filter(c => c.category !== 'default') || []
      
      // Map to form shape
      // Load travel contacts separately
      let travelData: Record<string, any> | null = null
      try {
        if (context) {
          const t = await getOrganizationTravelContacts(context)
          if (!t.error) travelData = t.data
        }
      } catch (err) {
        // ignore
      }

      const formData: ContactFormData = {
        defaultContact: {
            first_name: defaultContact?.first_name || '',
            last_name: defaultContact?.last_name || '',
            email: defaultContact?.email || '',
            phone: defaultContact?.phone || '',
            is_custom: true,
        },
        categories: CONTACT_CATEGORIES
          .filter(c => c !== 'default')
          .map(cat => {
            const existing = categoryContacts.find(c => c.category === cat)
            const base = {
              category: cat,
              is_custom: existing?.is_custom ?? false, // Default to false if no row
              first_name: existing?.first_name || '',
              last_name: existing?.last_name || '',
              email: existing?.email || '',
              phone: existing?.phone || '',
            }

            if (cat === 'travel') {
              return {
                ...base,
                travel_contacts: {
                  transportation: travelData?.transportation ? {
                    first_name: travelData.transportation.first_name || '',
                    last_name: travelData.transportation.last_name || '',
                    email: travelData.transportation.email || '',
                    phone: travelData.transportation.phone || '',
                  } : { first_name: '', last_name: '', email: '', phone: '' },
                  lodging: travelData?.lodging ? {
                    first_name: travelData.lodging.first_name || '',
                    last_name: travelData.lodging.last_name || '',
                    email: travelData.lodging.email || '',
                    phone: travelData.lodging.phone || '',
                  } : { first_name: '', last_name: '', email: '', phone: '' },
                  venue: travelData?.venue ? {
                    first_name: travelData.venue.first_name || '',
                    last_name: travelData.venue.last_name || '',
                    email: travelData.venue.email || '',
                    phone: travelData.venue.phone || '',
                  } : { first_name: '', last_name: '', email: '', phone: '' },
                  emergency: travelData?.emergency ? {
                    first_name: travelData.emergency.first_name || '',
                    last_name: travelData.emergency.last_name || '',
                    email: travelData.emergency.email || '',
                    phone: travelData.emergency.phone || '',
                  } : { first_name: '', last_name: '', email: '', phone: '' },
                }
              }
            }

            return base
          })
      }
      
      reset(formData)
    } catch (err) {
      showError('Failed to load contacts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ContactFormData) => {
    setSaving(true)
    try {
      // 1. Save Default Contact
      const { error: defaultError } = await upsertDefaultContact(orgId, data.defaultContact)
      if (defaultError) throw defaultError

      // 2. Save Category Contacts
      // We save all of them to ensure toggle state is persisted
      await Promise.all(data.categories.map(async (catRow) => {
          // If is_custom is true, ensure fields are valid (Zod handles simple type checks, 
          // but we might want to ensure they aren't empty strings here if Zod was optional)
          // The schema currently allows optional for the list items, but we should strictly validate if enabled.
          
          if (catRow.is_custom) {
             if (!catRow.first_name || !catRow.last_name || !catRow.email) {
                 throw new Error(`Missing required fields for ${catRow.category}`)
             }
          }

          const res = await upsertCategoryContact(orgId, catRow.category as ContactCategory, {
              is_custom: catRow.is_custom,
              first_name: catRow.first_name || '',
              last_name: catRow.last_name || '',
              email: catRow.email || '',
              phone: catRow.phone || null,
          })

          // If travel category, also upsert travel subcontacts
          if (catRow.category === 'travel' && context && catRow.travel_contacts) {
            // Validate subcontacts: if name provided, email required
            for (const sub of ['transportation','lodging','venue','emergency'] as const) {
              const sc = (catRow.travel_contacts as any)[sub]
              const hasName = sc?.first_name || sc?.last_name
              const email = sc?.email || ''
              if (hasName && !email) {
                throw new Error(`Email is required for ${sub} travel contact if a name is provided.`)
              }
              await upsertOrganizationTravelContact(context, sub as TravelContactCategoryOrg, {
                first_name: sc?.first_name || '',
                last_name: sc?.last_name || '',
                email: sc?.email || '',
                phone: sc?.phone || null,
              })
            }
          }

          return res
      }))

      showSuccess('Contacts updated successfully')
      // Reload to ensure consistent state
      loadData() 
      
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save contacts')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
      return <div className="pa-p-8 pa-text-center">Loading contacts...</div>
  }

  return (
    <div className="oa-contact-section">
      {/* Default Contact Section */}
      <Card title="Default Organization Contact (Required)">
        <p className="pa-text-sm pa-text-muted pa-mb-4">This contact is used whenever a category does not have its own contact.</p>
        <div className="oa-contact-form-grid">
                <Controller
                    control={control}
                    name="defaultContact.first_name"
                    render={({ field, fieldState }) => (
                        <Input {...field} label="First Name" required error={fieldState.error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="defaultContact.last_name"
                    render={({ field, fieldState }) => (
                        <Input {...field} label="Last Name" required error={fieldState.error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="defaultContact.email"
                    render={({ field, fieldState }) => (
                        <Input {...field} label="Email" type="email" required error={fieldState.error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="defaultContact.phone"
                    render={({ field, fieldState }) => (
                        <Input {...field} value={field.value || ''} label="Phone" type="tel" error={fieldState.error?.message} />
                    )}
                />
            </div>
      </Card>

      {/* Category Contacts Section */}
      <Card title="Category Contacts">
        <p className="pa-text-sm pa-text-muted pa-mb-4">Override the default contact for specific inquiries.</p>
        <div className="oa-category-list">
            {fields.map((field, index) => {
                const isCustom = watch(`categories.${index}.is_custom`)
                const categoryLabel = field.category.charAt(0).toUpperCase() + field.category.slice(1)
                
                return (
                    <div key={field.id} className="oa-category-row">
                        <div className="oa-category-header">
                            <h4 className="oa-category-title">{categoryLabel}</h4>
                            <div className="oa-category-toggle">
                                <Controller
                                    control={control}
                                    name={`categories.${index}.is_custom`}
                              render={({ field: switchField }) => (
                                <Switch
                                  label="Custom contact"
                                  checked={!!switchField.value}
                                  onCheckedChange={(checked) => switchField.onChange(checked)}
                                />
                                    )}
                                />
                            </div>
                        </div>

                        {isCustom ? (
                             <div className="oa-contact-form-grid">
                                <Controller
                                    control={control}
                                    name={`categories.${index}.first_name`}
                                    rules={{ required: isCustom ? "Required" : false }}
                                    render={({ field: inputField, fieldState }) => (
                                        <Input {...inputField} label="First Name" required={isCustom} error={fieldState.error?.message} />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name={`categories.${index}.last_name`}
                                    rules={{ required: isCustom ? "Required" : false }}
                                    render={({ field: inputField, fieldState }) => (
                                        <Input {...inputField} label="Last Name" required={isCustom} error={fieldState.error?.message} />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name={`categories.${index}.email`}
                                    rules={{ required: isCustom ? "Required" : false }}
                                    render={({ field: inputField, fieldState }) => (
                                        <Input {...inputField} label="Email" type="email" required={isCustom} error={fieldState.error?.message} />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name={`categories.${index}.phone`}
                                    render={({ field: inputField }) => (
                                        <Input {...inputField} value={inputField.value || ''} label="Phone" type="tel" />
                                    )}
                                />
                                {field.category === 'travel' && (
                                  <>
                                    <div className="pa-w-full pa-text-sm pa-text-muted pa-mb-2">Specify contacts for travel-related coordination. Leave empty to use the main Travel contact above.</div>
                                    {['transportation','lodging','venue','emergency'].map((sub, subIdx) => (
                                      <Fragment key={sub}>
                                        {subIdx > 0 && <hr className="pa-border-t pa-my-4" />}
                                        
                                        <div className="oa-contact-form-grid">
                                          <h4 className="oa-category-title">{sub.charAt(0).toUpperCase() + sub.slice(1)}</h4>
                                          <div className="pa-text-xs pa-text-muted pa-text-right">
                                            {sub === 'transportation' && 'Bus, flight, or excessive travel coordination.'}
                                            {sub === 'lodging' && 'Hotel and room block management.'}
                                            {sub === 'venue' && 'Contact at the venue (e.g. facility manager).'}
                                            {sub === 'emergency' && 'Urgent issues during the trip.'}
                                          </div>
                                          
                                          <Controller control={control} name={`categories.${index}.travel_contacts.${sub}.first_name`} render={({field: f}) => <Input {...f} label="First Name" />} />
                                          <Controller control={control} name={`categories.${index}.travel_contacts.${sub}.last_name`} render={({field: f}) => <Input {...f} label="Last Name" />} />
                                          <Controller control={control} name={`categories.${index}.travel_contacts.${sub}.email`} render={({field: f}) => <Input {...f} label="Email" type="email" />} />
                                          <Controller control={control} name={`categories.${index}.travel_contacts.${sub}.phone`} render={({field: f}) => <Input {...f} label="Phone" type="tel" />} />
                                        </div>
                                      </Fragment>
                                    ))}
                                  </>
                                )}
                            </div>
                        ) : (
                            <div className="oa-default-preview">
                            <div className="oa-default-badge">
                              <span className="material-symbols-outlined">settings</span>
                              Using default contact
                            </div>
                            <div className="oa-default-contact">
                              <div className="oa-default-name">
                                {watchedDefault.first_name} {watchedDefault.last_name}
                              </div>
                              <div className="oa-default-email">{watchedDefault.email}</div>
                            </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
      </Card>

      <div className="oa-form-actions">
          <Button onClick={handleSubmit(onSubmit)} loading={saving} variant="primary">
              Save Contact Settings
          </Button>
      </div>
    </div>
  )
}
