import { z } from 'zod'

export const CONTACT_CATEGORIES = [
    'default',
    'billing',
    'uniforms',
    'scheduling',
    'travel',
    'registration',
    'general',
] as const

export type ContactCategory = typeof CONTACT_CATEGORIES[number]

export interface OrganizationContact {
    id: string
    org_id: string
    category: ContactCategory
    is_custom: boolean
    first_name: string
    last_name: string
    email: string
    phone?: string | null
    updated_at: string
}

export const organizationContactSchema = z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional().nullable(),
    is_custom: z.boolean().default(false),
})

export const defaultContactSchema = organizationContactSchema.omit({ is_custom: true }).extend({
    is_custom: z.literal(true).default(true) // Default contact is always custom in the sense that it holds data
})

export type OrganizationContactFormData = z.infer<typeof organizationContactSchema>
