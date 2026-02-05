
import { useState, useEffect, Fragment } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, Button, Input, Switch } from '../../../components/platformAdmin'
import { showSuccess, showError } from '../../../utils/toast'
import { getErrorMessage } from '../../../utils/errorUtils'
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
import { type TravelContactCategoryOrg } from '../../../types/travelContacts'
import { 
  CONTACT_CATEGORIES, 
  type ContactCategory,
  defaultContactSchema 
} from '../../../types/organizationContacts'
import { useI18n } from '../../../i18n/useI18n'

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
  const { t } = useI18n()
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
      showError(getErrorMessage(err) || t('admin.organizationSettings.contacts.loadFailed'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ContactFormData) => {
    setSaving(true)
    try {
      if (!navigator.onLine) {
        throw new Error(t('common.error.offline'))
      }

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
                 const categoryLabel = t(`admin.organizationSettings.contacts.categories.${catRow.category}`)
                 throw new Error(t('admin.organizationSettings.contacts.missingFields', { category: categoryLabel }))
             }
          }

          const res = await upsertCategoryContact(orgId, catRow.category as ContactCategory, {
              is_custom: catRow.is_custom,
              first_name: catRow.first_name || '',
              last_name: catRow.last_name || '',
              email: catRow.email || '',
              phone: catRow.phone || null,
          })
          if (res.error) throw res.error

          // If travel category, also upsert travel subcontacts
          if (catRow.category === 'travel' && context && catRow.travel_contacts) {
            // Validate subcontacts: if name provided, email required
            for (const sub of ['transportation','lodging','venue','emergency'] as const) {
              const sc = (catRow.travel_contacts as any)[sub]
              const hasName = sc?.first_name || sc?.last_name
              const email = sc?.email || ''
              if (hasName && !email) {
                const subLabel = t(`admin.organizationSettings.contacts.travelCategories.${sub}`)
                throw new Error(t('admin.organizationSettings.contacts.travelEmailRequired', { category: subLabel }))
              }
              const { error: travelError } = await upsertOrganizationTravelContact(context, sub as TravelContactCategoryOrg, {
                first_name: sc?.first_name || '',
                last_name: sc?.last_name || '',
                email: sc?.email || '',
                phone: sc?.phone || null,
              })
              if (travelError) throw travelError
            }
          }

          return res
      }))

      showSuccess(t('admin.organizationSettings.contacts.saveSuccess'))
      // Reload to ensure consistent state
      loadData() 
      
    } catch (err) {
      showError(err instanceof Error ? err.message : t('admin.organizationSettings.contacts.saveFailed'))
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
      return <div className="pa-p-8 pa-text-center">{t('admin.organizationSettings.contacts.loading')}</div>
  }

  return (
    <div className="oa-contact-section">
      {/* Default Contact Section */}
      <Card title={t('admin.organizationSettings.contacts.defaultTitle')}>
        <p className="pa-text-sm pa-text-muted pa-mb-4">{t('admin.organizationSettings.contacts.defaultDescription')}</p>
        <div className="oa-contact-form-grid">
                <Controller
                    control={control}
                    name="defaultContact.first_name"
                    render={({ field, fieldState }) => (
                        <Input {...field} label={t('formFields.firstName')} required error={fieldState.error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="defaultContact.last_name"
                    render={({ field, fieldState }) => (
                        <Input {...field} label={t('formFields.lastName')} required error={fieldState.error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="defaultContact.email"
                    render={({ field, fieldState }) => (
                        <Input {...field} label={t('formFields.email')} type="email" required error={fieldState.error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="defaultContact.phone"
                    render={({ field, fieldState }) => (
                        <Input {...field} value={field.value || ''} label={t('formFields.phone')} type="tel" error={fieldState.error?.message} />
                    )}
                />
            </div>
      </Card>

      {/* Category Contacts Section */}
      <Card title={t('admin.organizationSettings.contacts.categoryTitle')}>
        <p className="pa-text-sm pa-text-muted pa-mb-4">{t('admin.organizationSettings.contacts.categoryDescription')}</p>
        <div className="oa-category-list">
            {fields.map((field, index) => {
                const isCustom = watch(`categories.${index}.is_custom`)
                const categoryLabel = t(`admin.organizationSettings.contacts.categories.${field.category}`)
                
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
                                  label={t('admin.organizationSettings.contacts.customContact')}
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
                                    rules={{ required: isCustom ? t('formFields.required') : false }}
                                    render={({ field: inputField, fieldState }) => (
                                        <Input {...inputField} label={t('formFields.firstName')} required={isCustom} error={fieldState.error?.message} />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name={`categories.${index}.last_name`}
                                    rules={{ required: isCustom ? t('formFields.required') : false }}
                                    render={({ field: inputField, fieldState }) => (
                                        <Input {...inputField} label={t('formFields.lastName')} required={isCustom} error={fieldState.error?.message} />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name={`categories.${index}.email`}
                                    rules={{ required: isCustom ? t('formFields.required') : false }}
                                    render={({ field: inputField, fieldState }) => (
                                        <Input {...inputField} label={t('formFields.email')} type="email" required={isCustom} error={fieldState.error?.message} />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name={`categories.${index}.phone`}
                                    render={({ field: inputField }) => (
                                        <Input {...inputField} value={inputField.value || ''} label={t('formFields.phone')} type="tel" />
                                    )}
                                />
                                {field.category === 'travel' && (
                                  <>
                                    <div className="pa-w-full pa-text-sm pa-text-muted pa-mb-2">{t('admin.organizationSettings.contacts.travelIntro')}</div>
                                    {['transportation','lodging','venue','emergency'].map((sub, subIdx) => (
                                      <Fragment key={sub}>
                                        {subIdx > 0 && <hr className="pa-border-t pa-my-4" />}
                                        
                                        <div className="oa-contact-form-grid">
                                          <h4 className="oa-category-title">{t(`admin.organizationSettings.contacts.travelCategories.${sub}`)}</h4>
                                          <div className="pa-text-xs pa-text-muted pa-text-right">
                                            {sub === 'transportation' && t('admin.organizationSettings.contacts.travelDescriptions.transportation')}
                                            {sub === 'lodging' && t('admin.organizationSettings.contacts.travelDescriptions.lodging')}
                                            {sub === 'venue' && t('admin.organizationSettings.contacts.travelDescriptions.venue')}
                                            {sub === 'emergency' && t('admin.organizationSettings.contacts.travelDescriptions.emergency')}
                                          </div>
                                          
                                          <Controller control={control} name={`categories.${index}.travel_contacts.${sub}.first_name` as any} render={({field: f}) => <Input {...f} value={(f.value as string) ?? ''} label={t('formFields.firstName')} />} />
                                          <Controller control={control} name={`categories.${index}.travel_contacts.${sub}.last_name` as any} render={({field: f}) => <Input {...f} value={(f.value as string) ?? ''} label={t('formFields.lastName')} />} />
                                          <Controller control={control} name={`categories.${index}.travel_contacts.${sub}.email` as any} render={({field: f}) => <Input {...f} value={(f.value as string) ?? ''} label={t('formFields.email')} type="email" />} />
                                          <Controller control={control} name={`categories.${index}.travel_contacts.${sub}.phone` as any} render={({field: f}) => <Input {...f} value={(f.value as string) ?? ''} label={t('formFields.phone')} type="tel" />} />
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
                              {t('admin.organizationSettings.contacts.usingDefault')}
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
              {t('admin.organizationSettings.contacts.save')}
          </Button>
      </div>
    </div>
  )
}
