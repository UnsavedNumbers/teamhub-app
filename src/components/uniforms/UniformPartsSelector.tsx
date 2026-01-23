/**
 * UniformPartsSelector Component
 * 
 * Displays available uniform parts for the selected sport.
 * Allows adding/removing parts (jersey, shorts, pants, hat, etc.)
 */

import { useState } from 'react'
import { Button, Card } from '../platformAdmin'
import type { SportUniformConfig } from '../../types/uniforms'

interface UniformPartsSelectorProps {
  config: SportUniformConfig | null
  selectedParts: string[]
  onPartsChange: (parts: string[]) => void
}

export function UniformPartsSelector({ 
  config, 
  selectedParts, 
  onPartsChange 
}: UniformPartsSelectorProps) {
  const availableParts = config?.visibleParts || []

  const togglePart = (part: string) => {
    if (selectedParts.includes(part)) {
      onPartsChange(selectedParts.filter(p => p !== part))
    } else {
      onPartsChange([...selectedParts, part])
    }
  }

  if (!config) {
    return (
      <Card>
        <p className="pa-text-muted">Select a sport to see available uniform parts.</p>
      </Card>
    )
  }

  return (
    <Card title="Uniform Parts">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {availableParts.map(part => {
          const isSelected = selectedParts.includes(part)
          return (
            <Button
              key={part}
              variant={isSelected ? 'primary' : 'secondary'}
              onClick={() => togglePart(part)}
              style={{
                textTransform: 'capitalize',
                minWidth: '100px'
              }}
            >
              {part}
            </Button>
          )
        })}
      </div>
      {selectedParts.length === 0 && (
        <p className="pa-helper" style={{ marginTop: '12px', color: 'var(--pa-text-muted)' }}>
          Select at least one uniform part.
        </p>
      )}
    </Card>
  )
}

export default UniformPartsSelector
