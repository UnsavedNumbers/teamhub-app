import { useFieldArray, Controller, Control, useWatch } from 'react-hook-form'
import { Switch, Input, Card } from '../../../components/platformAdmin'
import { 
    TRAVEL_CONTACT_CATEGORY_LABELS, 
    type TravelContactCategory,
    type TravelContactCategoryOrg,
    type OrganizationTravelContactRow
} from '../../../types/travelContacts'

interface PlanTravelContactsProps {
    control: Control<any>
    name: string
    orgContacts?: Record<TravelContactCategoryOrg, OrganizationTravelContactRow | null> | null
    orgEmail?: string
}

export default function PlanTravelContacts({ control, name }: PlanTravelContactsProps) {
    const { fields } = useFieldArray({
        control,
        name
    })

    return (
        <Card title="TRAVEL CONTACTS" className="pa-mt-8">
            <p className="pa-text-sm pa-text-muted pa-mb-4">
                Define contacts for this specific trip. If not set, the organization default for the category will be used.
            </p>
            <div className="oa-category-list">
                {fields.map((field, index) => {
                    const category = (field as { category?: TravelContactCategory }).category ?? 'general'
                    const label = TRAVEL_CONTACT_CATEGORY_LABELS[category] || category
                    const isCustom = useWatch({ control, name: `${name}.${index}.is_custom` })

                    return (
                        <div key={field.id} className="oa-category-row">
                            <div className="oa-category-header">
                                <h4 className="oa-category-title">{label}</h4>
                                <div className="oa-category-toggle">
                                    <Controller
                                        control={control}
                                        name={`${name}.${index}.is_custom`}
                                        render={({ field: switchField }) => (
                                            <Switch
                                                label="Custom contact"
                                                checked={!!switchField.value}
                                                onCheckedChange={switchField.onChange}
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                            {isCustom ? (
                                <CustomContactFields control={control} index={index} name={name} />
                            ) : (
                                <div className="oa-default-preview">
                                    <div className="oa-default-badge">
                                        <span className="material-symbols-outlined" aria-hidden>settings</span>
                                        Using default contact
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}

function CustomContactFields({ control, index, name }: { control: Control<any>; index: number; name: string }) {
    const isCustom = useWatch({
        control,
        name: `${name}.${index}.is_custom`
    })

    if (!isCustom) return null

    return (
        <div className="oa-contact-form-grid">
            <Controller
                control={control}
                name={`${name}.${index}.first_name`}
                rules={{ required: 'Required' }}
                render={({ field, fieldState }) => (
                    <Input {...field} label="First Name" required error={fieldState.error?.message} />
                )}
            />
            <Controller
                control={control}
                name={`${name}.${index}.last_name`}
                rules={{ required: 'Required' }}
                render={({ field, fieldState }) => (
                    <Input {...field} label="Last Name" required error={fieldState.error?.message} />
                )}
            />
            <Controller
                control={control}
                name={`${name}.${index}.email`}
                rules={{ required: 'Required' }}
                render={({ field, fieldState }) => (
                    <Input {...field} label="Email" type="email" required error={fieldState.error?.message} />
                )}
            />
            <Controller
                control={control}
                name={`${name}.${index}.phone`}
                render={({ field }) => (
                    <Input {...field} value={field.value || ''} label="Phone" type="tel" />
                )}
            />
        </div>
    )
}
