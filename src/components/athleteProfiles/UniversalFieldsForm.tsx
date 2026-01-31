/**
 * UniversalFieldsForm Component
 * 
 * Form for universal athlete profile fields (height, weight, sizes, etc.)
 * Includes unit conversion toggle for height and weight.
 * 
 * Design: Clean, intuitive inputs with smart unit conversion.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAthleteUniversalFields, useHeightInput, useWeightInput } from '../../hooks/useAthleteUniversalFields'
import type { Athlete } from '../../types/family'
import Button from '../portal/Button'

interface UniversalFieldsFormProps {
  /** Athlete data */
  athlete: Athlete
  /** Callback after successful save */
  onSave?: (athlete: Athlete) => void
  /** Callback on cancel */
  onCancel?: () => void
}

/**
 * UniversalFieldsForm - Form for universal athlete fields
 */
export function UniversalFieldsForm({
  athlete,
  onSave,
  onCancel,
}: UniversalFieldsFormProps) {
  // Unit preferences
  const [heightUnit, setHeightUnit] = useState<'metric' | 'imperial'>('imperial')
  const [weightUnit, setWeightUnit] = useState<'metric' | 'imperial'>('imperial')

  // Height input with conversion
  const heightInput = useHeightInput(athlete.height_cm || null, heightUnit)
  
  // Weight input with conversion
  const weightInput = useWeightInput(athlete.weight_kg || null, weightUnit)

  // Form state
  const [shoeSize, setShoeSize] = useState<number | null>(athlete.shoe_size_value || null)
  const [shoeSizeSystem, setShoeSizeSystem] = useState<'us' | 'eu' | 'uk' | null>(
    athlete.shoe_size_system || 'us'
  )
  const [shoeWidth, setShoeWidth] = useState<'narrow' | 'standard' | 'wide' | null>(
    athlete.shoe_width || 'standard'
  )
  const [tshirtSize, setTshirtSize] = useState<string | null>(athlete.tshirt_size || null)
  const [shortsSize, setShortsSize] = useState<string | null>(athlete.shorts_size || null)
  const [dominantHand, setDominantHand] = useState<'left' | 'right' | 'ambidextrous' | null>(
    athlete.dominant_hand || null
  )

  const [hasChanges, setHasChanges] = useState(false)

  // Update hook
  const { updating, error, updateFields } = useAthleteUniversalFields(athlete.id, onSave)

  // Mark as changed when any field changes
  useEffect(() => {
    setHasChanges(true)
  }, [heightInput.heightCm, weightInput.weightKg, shoeSize, shoeSizeSystem, shoeWidth, tshirtSize, shortsSize, dominantHand])

  // Handle save
  const handleSave = useCallback(async () => {
    const success = await updateFields({
      height_cm: heightInput.heightCm,
      weight_kg: weightInput.weightKg,
      shoe_size_value: shoeSize,
      shoe_size_system: shoeSizeSystem,
      shoe_width: shoeWidth,
      tshirt_size: tshirtSize,
      shorts_size: shortsSize,
      dominant_hand: dominantHand,
    })

    if (success) {
      setHasChanges(false)
    }
  }, [updateFields, heightInput.heightCm, weightInput.weightKg, shoeSize, shoeSizeSystem, shoeWidth, tshirtSize, shortsSize, dominantHand])

  return (
    <div className="portal-form universal-fields-form">

      {/* Error banner */}
      {error && (
        <div className="form-error-banner">
          <span className="material-symbols-outlined">error</span>
          <span>{error.message}</span>
        </div>
      )}

      {/* Fields */}
      <div className="form-fields">
        {/* Height */}
        <div className="field-group">
          <div className="form-row">
            <label className="form-label">Height</label>
            <div className="unit-toggle">
              <button
                type="button"
                onClick={() => setHeightUnit('imperial')}
                className={`unit-toggle-btn ${heightUnit === 'imperial' ? 'active' : ''}`}
              >
                ft/in
              </button>
              <button
                type="button"
                onClick={() => setHeightUnit('metric')}
                className={`unit-toggle-btn ${heightUnit === 'metric' ? 'active' : ''}`}
              >
                cm
              </button>
            </div>
          </div>

          {heightUnit === 'imperial' ? (
            <div className="form-row two-col">
              <div className="form-field form-field--small">
                <input
                  type="number"
                  value={heightInput.feet || ''}
                  onChange={(e) => heightInput.setHeightImperial(
                    parseInt(e.target.value) || 0,
                    heightInput.inches
                  )}
                  className="form-input"
                  placeholder="0"
                  min="0"
                  max="8"
                />
                <span className="field-unit">ft</span>
              </div>
              <div className="form-field form-field--small">
                <input
                  type="number"
                  value={heightInput.inches || ''}
                  onChange={(e) => heightInput.setHeightImperial(
                    heightInput.feet,
                    parseInt(e.target.value) || 0
                  )}
                  className="form-input"
                  placeholder="0"
                  min="0"
                  max="11"
                />
                <span className="field-unit">in</span>
              </div>
            </div>
          ) : (
            <div className="form-field form-field--medium">
              <input
                type="number"
                value={heightInput.heightCm || ''}
                onChange={(e) => heightInput.setHeightMetric(parseFloat(e.target.value) || null)}
                className="form-input"
                placeholder="0"
                min="50"
                max="250"
              />
              <span className="field-unit">cm</span>
            </div>
          )} 
          <p className="field-help">Used for uniform sizing and equipment fitting</p>
        </div>

        {/* Weight */}
        <div className="field-group">
          <div className="form-row">
            <label className="form-label">Weight</label>
            <div className="unit-toggle">
              <button
                type="button"
                onClick={() => setWeightUnit('imperial')}
                className={`unit-toggle-btn ${weightUnit === 'imperial' ? 'active' : ''}`}
              >
                lbs
              </button>
              <button
                type="button"
                onClick={() => setWeightUnit('metric')}
                className={`unit-toggle-btn ${weightUnit === 'metric' ? 'active' : ''}`}
              >
                kg
              </button>
            </div>
          </div>

          <div>
            {weightUnit === 'imperial' ? (
              <>
                <input
                  type="number"
                  value={weightInput.weightLbs || ''}
                  onChange={(e) => weightInput.setWeightImperial(parseFloat(e.target.value) || 0)}
                  className="form-input form-field--small"
                  placeholder="0"
                  min="0"
                  max="500"
                  step="0.1"
                />
                <span className="field-unit">lbs</span>
              </>
            ) : (
              <>
                <input
                  type="number"
                  value={weightInput.weightKg || ''}
                  onChange={(e) => weightInput.setWeightMetric(parseFloat(e.target.value) || null)}
                  className="form-input form-field--small"
                  placeholder="0"
                  min="0"
                  max="200"
                  step="0.1"
                />
                <span className="field-unit">kg</span>
              </>
            )}
          </div>
          <p className="field-help">Optional - helps with equipment recommendations</p>
        </div>

        {/* Shoe Size */}
        <div className="field-group">
          <label className="form-label">Shoe Size</label>
          <div className="form-row two-col">
            <div className="form-field form-field--small">
              <input
                type="number"
                value={shoeSize || ''}
                onChange={(e) => setShoeSize(parseFloat(e.target.value) || null)}
                className="form-input"
                placeholder="Size"
                step="0.5"
              />
            </div>
            <div className="form-field">
              <select
                value={shoeSizeSystem || 'us'}
                onChange={(e) => setShoeSizeSystem(e.target.value as 'us' | 'eu' | 'uk')}
                className="form-select"
              >
                <option value="us">US</option>
                <option value="eu">EU</option>
                <option value="uk">UK</option>
              </select>
            </div>
            <div className="form-field">
              <select
                value={shoeWidth || 'standard'}
                onChange={(e) => setShoeWidth(e.target.value as 'narrow' | 'standard' | 'wide')}
                className="form-select"
              >
                <option value="narrow">Narrow</option>
                <option value="standard">Standard</option>
                <option value="wide">Wide</option>
              </select>
            </div>
          </div>
          <p className="field-help">Important for proper footwear fitting</p>
        </div> 

        {/* Clothing Sizes */}
        <div className="field-group">
          <label className="form-label">T-Shirt Size</label>
          <select
            value={tshirtSize || ''}
            onChange={(e) => setTshirtSize(e.target.value || null)}
            className="form-select"
          >
            <option value="">Select size</option>
            <option value="YXS">Youth XS</option>
            <option value="YS">Youth S</option>
            <option value="YM">Youth M</option>
            <option value="YL">Youth L</option>
            <option value="YXL">Youth XL</option>
            <option value="AS">Adult S</option>
            <option value="AM">Adult M</option>
            <option value="AL">Adult L</option>
            <option value="AXL">Adult XL</option>
            <option value="A2XL">Adult 2XL</option>
          </select>
          <p className="field-help">For team uniforms and apparel orders</p>
        </div>

        <div className="field-group">
          <label className="form-label">Shorts Size</label>
          <select
            value={shortsSize || ''}
            onChange={(e) => setShortsSize(e.target.value || null)}
            className="form-select"
          >
            <option value="">Select size</option>
            <option value="YXS">Youth XS</option>
            <option value="YS">Youth S</option>
            <option value="YM">Youth M</option>
            <option value="YL">Youth L</option>
            <option value="YXL">Youth XL</option>
            <option value="AS">Adult S</option>
            <option value="AM">Adult M</option>
            <option value="AL">Adult L</option>
            <option value="AXL">Adult XL</option>
            <option value="A2XL">Adult 2XL</option>
          </select>
          <p className="field-help">For team uniforms and apparel orders</p>
        </div>

        {/* Dominant Hand */}
        <div className="field-group">
          <label className="form-label">Dominant Hand</label>
          <div className="radio-row">
            <label className="form-radio-label">
              <input
                type="radio"
                name="dominant_hand"
                value="left"
                checked={dominantHand === 'left'}
                onChange={(e) => setDominantHand(e.target.value as 'left')}
                className="form-radio"
              />
              <span>Left</span>
            </label>
            <label className="form-radio-label">
              <input
                type="radio"
                name="dominant_hand"
                value="right"
                checked={dominantHand === 'right'}
                onChange={(e) => setDominantHand(e.target.value as 'right')}
                className="form-radio"
              />
              <span>Right</span>
            </label>
            <label className="form-radio-label">
              <input
                type="radio"
                name="dominant_hand"
                value="ambidextrous"
                checked={dominantHand === 'ambidextrous'}
                onChange={(e) => setDominantHand(e.target.value as 'ambidextrous')}
                className="form-radio"
              />
              <span>Ambidextrous</span>
            </label>
          </div>
          <p className="field-help">Helps with equipment selection and positioning</p>
        </div>
      </div>

      {/* Actions */}
      <div className="form-actions">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={updating}>
            Cancel
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} disabled={updating || !hasChanges}>
          {updating ? (
            <>
              <span className="btn-spinner"></span>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
              <span>Save Information</span>
            </>
          )}
        </Button>
      </div>

      {/* Unsaved changes warning */}
      {hasChanges && !updating && (
        <div className="form-unsaved-warning">
          <span className="material-symbols-outlined">info</span>
          <span>You have unsaved changes</span>
        </div>
      )}
    </div>
  )
}
