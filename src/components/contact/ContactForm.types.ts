/**
 * ContactForm Component Types
 */

import type { ContactSurface } from '../../types/contact'

export interface ContactFormProps {
  surface: ContactSurface
  subjects: readonly string[]
  defaultEmail?: string
  defaultName?: string
  requireName?: boolean
  requireEmail?: boolean
}

export interface ContactFormState {
  subject: string
  message: string
  name: string
  email: string
}

export interface ContactFormErrors {
  subject?: string
  message?: string
  name?: string
  email?: string
}
