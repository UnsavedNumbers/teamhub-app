/**
 * Uniform Types
 * 
 * Type definitions for sport-specific uniforms system.
 */

export type UniformFieldType = 'text' | 'select' | 'toggle' | 'color' | 'number'

export interface UniformFieldDefinition {
  key: string
  label: string
  type: UniformFieldType
  required?: boolean
  options?: string[]
  visibility?: {
    dependsOn?: string
    condition?: (value: any) => boolean
  }
  defaultValue?: any
}

export interface UniformOptionalSection {
  key: string
  label: string
  fields: UniformFieldDefinition[]
}

export interface SportUniformConfig {
  visibleParts: string[]
  fields: UniformFieldDefinition[]
  hiddenFields?: string[]
  optionalSections?: UniformOptionalSection[]
  specialRules?: Record<string, any>
}

export interface UniformKitWithSport {
  id: string
  team_id: string | null
  season_id: string | null
  name: string
  sport_id: string
  program_id: string | null
  org_id: string
  deadline_at: string | null
  locked_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  sport_specific_fields: Record<string, any>
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  vendor: string | null
  notes: string | null
  status: string
  // Relations
  sport?: {
    id: string
    name: string
    color: string
    icon: string | null
  }
  program?: {
    id: string
    name: string
    gender_category: string
  }
}

export interface CreateUniformKitDTO {
  team_id?: string | null
  season_id?: string | null
  name: string
  sport_id: string
  program_id?: string | null
  org_id: string
  deadline_at?: string | null
  sport_specific_fields?: Record<string, any>
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  vendor?: string | null
  notes?: string | null
  status?: string
  items?: Array<{
    name: string
    required: boolean
    size_options: string[]
    sort_order?: number
    sport_specific_fields?: Record<string, any>
  }>
}

export interface UpdateUniformKitDTO {
  name?: string
  sport_id?: string
  program_id?: string | null
  season_id?: string | null
  deadline_at?: string | null
  sport_specific_fields?: Record<string, any>
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  vendor?: string | null
  notes?: string | null
  status?: string
}
