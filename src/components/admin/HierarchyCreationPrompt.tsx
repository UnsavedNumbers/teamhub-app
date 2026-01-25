/**
 * Hierarchy Creation Prompt Component
 * 
 * Displays a persistent success message with a prompt to create the next level
 * in the hierarchy after successful entity creation.
 */

import { useT } from '../../i18n/useI18n'
import { Card, Button } from '../platformAdmin'
import type { FormType } from '../../utils/hierarchyCreation'
import { getNextLevel, getEntityLabelKey } from '../../utils/hierarchyCreation'
import type { TranslationKey } from '../../i18n'

export interface HierarchyCreationPromptProps {
  createdEntityType: FormType
  createdEntityId: string
  createdEntityName: string
  onAddNext: () => void
  onDismiss: () => void
}

/**
 * Hierarchy Creation Prompt
 * 
 * Shows a success message with a prompt to create the next level in the hierarchy.
 * Includes "Add [next level]" primary action and "Not now" secondary action.
 */
export function HierarchyCreationPrompt({
  createdEntityType,
  createdEntityId: _createdEntityId,
  createdEntityName,
  onAddNext,
  onDismiss,
}: HierarchyCreationPromptProps) {
  const t = useT()

  // Get next level in hierarchy
  const nextLevel = getNextLevel(createdEntityType)

  // If no next level, don't render (shouldn't happen, but defensive)
  if (!nextLevel) {
    return null
  }

  // Get translation keys for entity labels
  const itemKey = getEntityLabelKey(createdEntityType)
  const nextItemKey = getEntityLabelKey(nextLevel)

  // Get translated labels with fallbacks
  const itemLabel = t(itemKey as TranslationKey) || createdEntityName
  const nextItemLabel = t(nextItemKey as TranslationKey) || nextLevel

  // Build translation params
  const messageParams = {
    item: itemLabel,
    nextItem: nextItemLabel,
  }

  // Get messages with fallbacks
  const successMessage = t('admin.structureForms.messages.createdWithNextStep', messageParams) ||
    `${itemLabel} created successfully. Would you like to add a ${nextItemLabel} now?`
  
  const addButtonLabel = t('admin.structureForms.messages.addNextLevel', { nextItem: nextItemLabel }) ||
    `Add ${nextItemLabel}`
  
  const notNowLabel = t('admin.structureForms.messages.notNow') || 'Not now'

  return (
    <Card className="pa-mb-6" style={{ borderLeft: '3px solid var(--pa-success)' }}>
      <div style={{ padding: 'var(--pa-space-4)' }}>
        <div className="pa-body-m" style={{ color: 'var(--pa-success)', marginBottom: 'var(--pa-space-4)' }}>
          {successMessage}
        </div>
        <div style={{ display: 'flex', gap: 'var(--pa-space-3)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onDismiss}>
            {notNowLabel}
          </Button>
          <Button variant="primary" onClick={onAddNext}>
            {addButtonLabel}
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default HierarchyCreationPrompt
