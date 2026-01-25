/**
 * Hierarchy Creation Utilities
 * 
 * Provides utilities for managing the organization structure hierarchy:
 * Sport → Program → Level → Team
 * 
 * Season is org-scoped and separate from this hierarchy.
 */

export type FormType = 'sport' | 'program' | 'level' | 'team' | 'season'

/**
 * Hierarchy mapping: defines what comes next after each entity type
 */
const HIERARCHY_MAP: Record<FormType, FormType | null> = {
  sport: 'program',
  program: 'level',
  level: 'team',
  team: null,
  season: null,
} as const

/**
 * Parent context key mapping: query param key for each entity type
 */
const PARENT_CONTEXT_KEYS: Record<FormType, string> = {
  sport: 'sport_id',
  program: 'program_id',
  level: 'level_id',
  team: '', // Team has no parent context key (end of hierarchy)
  season: '', // Season is org-scoped, no parent
} as const

/**
 * Translation key mapping: entity label translation key for each entity type
 */
const ENTITY_LABEL_KEYS: Record<FormType, string> = {
  sport: 'admin.structureForms.items.sport',
  program: 'admin.structureForms.items.program',
  level: 'admin.structureForms.items.level',
  team: 'admin.structureForms.items.team',
  season: 'admin.structureForms.items.season',
} as const

/**
 * Get the next level in the hierarchy after the current level
 * 
 * @param currentLevel - The current entity type
 * @returns The next level or null if at end of hierarchy
 * 
 * @example
 * getNextLevel('sport') // returns 'program'
 * getNextLevel('team') // returns null
 */
export function getNextLevel(currentLevel: FormType): FormType | null {
  return HIERARCHY_MAP[currentLevel] ?? null
}

/**
 * Get the query parameter key for the parent context
 * 
 * @param level - The entity type
 * @returns The query param key (e.g., 'sport_id', 'program_id', 'level_id') or empty string
 * 
 * @example
 * getParentContextKey('program') // returns 'sport_id'
 * getParentContextKey('team') // returns 'level_id'
 */
export function getParentContextKey(level: FormType): string {
  return PARENT_CONTEXT_KEYS[level] ?? ''
}

/**
 * Get the translation key for the entity label
 * 
 * @param level - The entity type
 * @returns The translation key path
 * 
 * @example
 * getEntityLabelKey('sport') // returns 'admin.structureForms.items.sport'
 */
export function getEntityLabelKey(level: FormType): string {
  return ENTITY_LABEL_KEYS[level] ?? ''
}

/**
 * Prompt state stored in sessionStorage
 */
export interface PromptState {
  entityType: FormType
  entityId: string
  entityName: string
  nextLevel: FormType | null
  timestamp: number
}

/**
 * Type guard to validate prompt state from sessionStorage
 * 
 * @param data - Unknown data from sessionStorage
 * @returns True if data is valid PromptState
 */
export function isValidPromptState(data: unknown): data is PromptState {
  if (!data || typeof data !== 'object') {
    return false
  }

  const obj = data as Record<string, unknown>

  // Check required fields
  if (typeof obj.entityType !== 'string' || !isFormType(obj.entityType)) {
    return false
  }
  if (typeof obj.entityId !== 'string' || obj.entityId.length === 0) {
    return false
  }
  if (typeof obj.entityName !== 'string') {
    return false
  }
  if (obj.nextLevel !== null && (typeof obj.nextLevel !== 'string' || !isFormType(obj.nextLevel))) {
    return false
  }
  if (typeof obj.timestamp !== 'number') {
    return false
  }

  return true
}

/**
 * Type guard to check if a string is a valid FormType
 */
function isFormType(value: string): value is FormType {
  return value === 'sport' || value === 'program' || value === 'level' || value === 'team' || value === 'season'
}

/**
 * Validate that an entity exists in the provided data arrays
 * 
 * @param entityType - Type of entity to validate
 * @param entityId - ID of entity to find
 * @param dataArrays - Object containing arrays of entities by type
 * @returns True if entity exists
 */
export function validateEntityExists(
  entityType: FormType,
  entityId: string,
  dataArrays: {
    sports?: Array<{ id: string }>
    programs?: Array<{ id: string }>
    levels?: Array<{ id: string }>
    teams?: Array<{ id: string }>
    seasons?: Array<{ id: string }>
  }
): boolean {
  switch (entityType) {
    case 'sport':
      return dataArrays.sports?.some(s => s.id === entityId) ?? false
    case 'program':
      return dataArrays.programs?.some(p => p.id === entityId) ?? false
    case 'level':
      return dataArrays.levels?.some(l => l.id === entityId) ?? false
    case 'team':
      return dataArrays.teams?.some(t => t.id === entityId) ?? false
    case 'season':
      return dataArrays.seasons?.some(s => s.id === entityId) ?? false
    default:
      // Exhaustive check - TypeScript will error if we miss a case
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return (entityType as never, false)
  }
}

/**
 * Validate parent-child relationship exists
 * 
 * @param parentType - Type of parent entity
 * @param parentId - ID of parent entity
 * @param childType - Type of child entity
 * @param dataArrays - Object containing arrays of entities by type
 * @returns True if parent-child relationship is valid
 */
export function validateParentChildRelationship(
  parentType: FormType,
  parentId: string,
  childType: FormType,
  dataArrays: {
    sports?: Array<{ id: string; org_id?: string }>
    programs?: Array<{ id: string; sport_id?: string; org_id?: string }>
    levels?: Array<{ id: string; program_id?: string; org_id?: string }>
    teams?: Array<{ id: string; level_id?: string; org_id?: string }>
  }
): boolean {
  // First validate parent exists
  if (!validateEntityExists(parentType, parentId, dataArrays)) {
    return false
  }

  // Validate hierarchy relationships
  switch (parentType) {
    case 'sport':
      if (childType !== 'program') return false
      return dataArrays.programs?.some(p => p.sport_id === parentId) ?? false
    case 'program':
      if (childType !== 'level') return false
      return dataArrays.levels?.some(l => l.program_id === parentId) ?? false
    case 'level':
      if (childType !== 'team') return false
      return dataArrays.teams?.some(t => t.level_id === parentId) ?? false
    case 'team':
    case 'season':
      // These have no children in the hierarchy
      return false
    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return (parentType as never, false)
  }
}
