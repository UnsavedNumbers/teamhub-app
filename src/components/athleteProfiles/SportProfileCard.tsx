/**
 * SportProfileCard Component
 *
 * Consolidated card for sport-specific athlete profiles with tabbed navigation.
 * Combines Profile Information and Equipment & Gear into a single card.
 *
 * Design: Tabbed interface with consistent portal styling.
 */

import { useState, useEffect, useCallback } from 'react'
import { FieldRenderer } from './FieldRenderer'
import { useSportFieldDefinitions } from '../../hooks/useSportFieldDefinitions'
import { useAthleteSportProfile } from '../../hooks/useAthleteSportProfile'
import Card from '../portal/Card'
import { CardTitle } from '../portal/Typography'
import Button from '../portal/Button'
import type { SportCode } from '../../types/sports'
import type { SportFieldDefinition } from '../../types/athleteSportProfiles'

interface SportProfileCardProps {
  /** Athlete ID */
  athleteId: string
  /** Sport code */
  sportCode: SportCode
  /** Callback after successful save */
  onSave?: () => void
  /** Callback on cancel */
  onCancel?: () => void
}

/**
 * SportProfileCard - Consolidated tabbed card for sport profiles
 */
export function SportProfileCard({
  athleteId,
  sportCode,
  onSave,
  onCancel,
}: SportProfileCardProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'equipment'>('profile')

  // Fetch field definitions
  const { profileFields, equipmentFields, loading: fieldsLoading, error: fieldsError } =
    useSportFieldDefinitions(sportCode)

  // Fetch/update profile
  const { profile, loading: profileLoading, updating, updateProfile, error: profileError } =
    useAthleteSportProfile(athleteId, sportCode)

  // Form state
  const [profileData, setProfileData] = useState<Record<string, unknown>>({})
  const [equipmentData, setEquipmentData] = useState<Record<string, unknown>>({})
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [equipmentErrors, setEquipmentErrors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setProfileData(profile.profile_data || {})
      setEquipmentData(profile.equipment_data || {})
    }
  }, [profile])

  // Handle field change
  const handleProfileFieldChange = useCallback((fieldKey: string, value: unknown) => {
    setProfileData((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
    setHasChanges(true)
    setProfileErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[fieldKey]
      return newErrors
    })
  }, [])

  const handleEquipmentFieldChange = useCallback((fieldKey: string, value: unknown) => {
    setEquipmentData((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))
    setHasChanges(true)
    setEquipmentErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[fieldKey]
      return newErrors
    })
  }, [])

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newProfileErrors: Record<string, string> = {}
    const newEquipmentErrors: Record<string, string> = {}

    profileFields.forEach((field) => {
      const value = profileData[field.field_key]
      const isRequired = !field.is_optional
      if (isRequired && (value === null || value === undefined || value === '')) {
        newProfileErrors[field.field_key] = `${field.field_label} is required`
      }
    })

    equipmentFields.forEach((field) => {
      const value = equipmentData[field.field_key]
      const isRequired = !field.is_optional
      if (isRequired && (value === null || value === undefined || value === '')) {
        newEquipmentErrors[field.field_key] = `${field.field_label} is required`
      }
    })

    setProfileErrors(newProfileErrors)
    setEquipmentErrors(newEquipmentErrors)
    return Object.keys(newProfileErrors).length === 0 && Object.keys(newEquipmentErrors).length === 0
  }, [profileFields, equipmentFields, profileData, equipmentData])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    const success = await updateProfile(profileData, equipmentData)

    if (success) {
      setHasChanges(false)
      onSave?.()
    }
  }, [validateForm, updateProfile, profileData, equipmentData, onSave])

  // Helper to determine four-field groupings
  const getFourFieldGroup = (
    field1: SportFieldDefinition,
    field2: SportFieldDefinition,
    field3: SportFieldDefinition,
    field4: SportFieldDefinition
  ): { className: string } | null => {
    if (!field2 || !field3 || !field4) return null

    // Football tackle equipment: helmet_size_circumference, helmet_brand_pref, shoulder_pad_size, shoulder_pad_style
    if (
      field1.field_key === 'helmet_size_circumference' &&
      field2.field_key === 'helmet_brand_pref' &&
      field3.field_key === 'shoulder_pad_size' &&
      field4.field_key === 'shoulder_pad_style'
    ) {
      return { className: 'four-col-25' }
    }

    // Ice hockey equipment: skate_size, skate_width, helmet_size, cage_visor_pref
    if (
      field1.field_key === 'skate_size' &&
      field2.field_key === 'skate_width' &&
      field3.field_key === 'helmet_size' &&
      field4.field_key === 'cage_visor_pref'
    ) {
      return { className: 'four-col-25' }
    }

    // Baseball/Softball equipment: glove_size_in, glove_type, bat_length_in, bat_weight_oz
    if (
      (field1.field_key === 'glove_size_in' || field1.field_key === 'glove_size') &&
      field2.field_key === 'glove_type' &&
      field3.field_key === 'bat_length_in' &&
      field4.field_key === 'bat_weight_oz'
    ) {
      return { className: 'four-col-25' }
    }

    // Tennis equipment: racquet_grip_size, racquet_head_size_pref, string_tension_lbs, shoe_size
    if (
      field1.field_key === 'racquet_grip_size' &&
      field2.field_key === 'racquet_head_size_pref' &&
      field3.field_key === 'string_tension_lbs' &&
      field4.field_key === 'shoe_size'
    ) {
      return { className: 'four-col-25' }
    }

    // Track equipment: sprint_spike_size, distance_spike_size, spike_length_pref, training_shoe_size
    if (
      field1.field_key === 'sprint_spike_size' &&
      field2.field_key === 'distance_spike_size' &&
      field3.field_key === 'spike_length_pref' &&
      field4.field_key === 'training_shoe_size'
    ) {
      return { className: 'four-col-25' }
    }

    // General: four small size fields in sequence (equal quarters)
    const sizeFieldPattern = /_(size|length|width|height|inseam|waist)$/
    if (
      sizeFieldPattern.test(field1.field_key) &&
      sizeFieldPattern.test(field2.field_key) &&
      sizeFieldPattern.test(field3.field_key) &&
      sizeFieldPattern.test(field4.field_key)
    ) {
      const shortFieldTypes = ['text', 'enum', 'int', 'numeric']
      if (
        shortFieldTypes.includes(field1.field_type) &&
        shortFieldTypes.includes(field2.field_type) &&
        shortFieldTypes.includes(field3.field_type) &&
        shortFieldTypes.includes(field4.field_type)
      ) {
        return { className: 'four-col-25' }
      }
    }

    return null
  }

  // Render fields with layout
  const renderFieldsWithLayout = (
    fields: SportFieldDefinition[],
    data: Record<string, unknown>,
    onChange: (fieldKey: string, value: unknown) => void,
    errors: Record<string, string>,
    disabled: boolean
  ) => {
    const elements: JSX.Element[] = []
    let i = 0

    while (i < fields.length) {
      const field = fields[i]
      const nextField = fields[i + 1]
      const nextNextField = fields[i + 2]
      const nextNextNextField = fields[i + 3]

      // Check for four-field groupings first
      const fourFieldGroup = getFourFieldGroup(field, nextField, nextNextField, nextNextNextField)
      if (fourFieldGroup && nextField && nextNextField && nextNextNextField) {
        elements.push(
          <div
            key={`${field.field_key}-${nextField.field_key}-${nextNextField.field_key}-${nextNextNextField.field_key}`}
            className={`form-row ${fourFieldGroup.className}`}
          >
            <div className="form-field">
              <FieldRenderer
                field={field}
                value={data[field.field_key]}
                onChange={(value) => onChange(field.field_key, value)}
                disabled={disabled}
                error={errors[field.field_key]}
              />
            </div>
            <div className="form-field">
              <FieldRenderer
                field={nextField}
                value={data[nextField.field_key]}
                onChange={(value) => onChange(nextField.field_key, value)}
                disabled={disabled}
                error={errors[nextField.field_key]}
              />
            </div>
            <div className="form-field">
              <FieldRenderer
                field={nextNextField}
                value={data[nextNextField.field_key]}
                onChange={(value) => onChange(nextNextField.field_key, value)}
                disabled={disabled}
                error={errors[nextNextField.field_key]}
              />
            </div>
            <div className="form-field">
              <FieldRenderer
                field={nextNextNextField}
                value={data[nextNextNextField.field_key]}
                onChange={(value) => onChange(nextNextNextField.field_key, value)}
                disabled={disabled}
                error={errors[nextNextNextField.field_key]}
              />
            </div>
          </div>
        )
        i += 4
        continue
      }

      // Check for three-field groupings
      const threeFieldGroup = getThreeFieldGroup(field, nextField, nextNextField)
      if (threeFieldGroup && nextField && nextNextField) {
        elements.push(
          <div key={`${field.field_key}-${nextField.field_key}-${nextNextField.field_key}`} className={`form-row ${threeFieldGroup.className}`}>
            <div className="form-field">
              <FieldRenderer
                field={field}
                value={data[field.field_key]}
                onChange={(value) => onChange(field.field_key, value)}
                disabled={disabled}
                error={errors[field.field_key]}
              />
            </div>
            <div className="form-field">
              <FieldRenderer
                field={nextField}
                value={data[nextField.field_key]}
                onChange={(value) => onChange(nextField.field_key, value)}
                disabled={disabled}
                error={errors[nextField.field_key]}
              />
            </div>
            <div className="form-field">
              <FieldRenderer
                field={nextNextField}
                value={data[nextNextField.field_key]}
                onChange={(value) => onChange(nextNextField.field_key, value)}
                disabled={disabled}
                error={errors[nextNextField.field_key]}
              />
            </div>
          </div>
        )
        i += 3
        continue
      }

      // Check for two-field groupings
      const twoFieldGroup = getTwoFieldGroup(field, nextField)
      if (twoFieldGroup && nextField) {
        elements.push(
          <div key={`${field.field_key}-${nextField.field_key}`} className={`form-row ${twoFieldGroup.className}`}>
            <div className="form-field">
              <FieldRenderer
                field={field}
                value={data[field.field_key]}
                onChange={(value) => onChange(field.field_key, value)}
                disabled={disabled}
                error={errors[field.field_key]}
              />
            </div>
            <div className="form-field">
              <FieldRenderer
                field={nextField}
                value={data[nextField.field_key]}
                onChange={(value) => onChange(nextField.field_key, value)}
                disabled={disabled}
                error={errors[nextField.field_key]}
              />
            </div>
          </div>
        )
        i += 2
        continue
      }

      // Single field
      elements.push(
        <FieldRenderer
          key={field.field_key}
          field={field}
          value={data[field.field_key]}
          onChange={(value) => onChange(field.field_key, value)}
          disabled={disabled}
          error={errors[field.field_key]}
        />
      )
      i += 1
    }

    return elements
  }

  // Helper to determine three-field groupings
  const getThreeFieldGroup = (field1: SportFieldDefinition, field2: SportFieldDefinition, field3: SportFieldDefinition): { className: string } | null => {
    if (!field2 || !field3) return null

    // City, state, zip pattern
    if (field1.field_key === 'city' && field2.field_key === 'state' && field3.field_key === 'zip_code') {
      return { className: 'three-col-50-25-25' }
    }

    // Basketball measurements: years_experience, wingspan_in, vertical_jump_in (equal thirds)
    if (field1.field_key === 'years_experience' && field2.field_key === 'wingspan_in' && field3.field_key === 'vertical_jump_in') {
      return { className: 'three-col-33' }
    }

    // Soccer equipment: cleat_size, shin_guard_size, goalie_glove_size (equal thirds)
    if (field1.field_key === 'cleat_size' && field2.field_key === 'shin_guard_size' && field3.field_key === 'goalie_glove_size') {
      return { className: 'three-col-33' }
    }

    // Baseball/Softball pants: pants_waist, pants_inseam, pants_fit (equal thirds)
    if (field1.field_key === 'pants_waist' && field2.field_key === 'pants_inseam' && field3.field_key === 'pants_fit') {
      return { className: 'three-col-33' }
    }
    if (field1.field_key === 'pants_waist_in' && field2.field_key === 'pants_inseam_in' && field3.field_key === 'pants_fit') {
      return { className: 'three-col-33' }
    }

    // Ice hockey stick: stick_length_in, stick_flex, stick_curve_pref (equal thirds)
    if (field1.field_key === 'stick_length_in' && field2.field_key === 'stick_flex' && field3.field_key === 'stick_curve_pref') {
      return { className: 'three-col-33' }
    }

    // Tennis racquet: racquet_grip_size, racquet_head_size_pref, string_tension_lbs (equal thirds)
    if (field1.field_key === 'racquet_grip_size' && field2.field_key === 'racquet_head_size_pref' && field3.field_key === 'string_tension_lbs') {
      return { className: 'three-col-33' }
    }

    // Track spikes: sprint_spike_size, distance_spike_size, spike_length_pref (equal thirds)
    if (field1.field_key === 'sprint_spike_size' && field2.field_key === 'distance_spike_size' && field3.field_key === 'spike_length_pref') {
      return { className: 'three-col-33' }
    }

    // Golf equipment: club_length_fit, grip_size, glove_size (equal thirds)
    if (field1.field_key === 'club_length_fit' && field2.field_key === 'grip_size' && field3.field_key === 'glove_size') {
      return { className: 'three-col-33' }
    }

    // General: three small size fields in sequence (equal thirds)
    const sizeFieldPattern = /_(size|length|width|height|inseam|waist)$/
    if (sizeFieldPattern.test(field1.field_key) && sizeFieldPattern.test(field2.field_key) && sizeFieldPattern.test(field3.field_key)) {
      const shortFieldTypes = ['text', 'enum', 'int', 'numeric']
      if (shortFieldTypes.includes(field1.field_type) && shortFieldTypes.includes(field2.field_type) && shortFieldTypes.includes(field3.field_type)) {
        return { className: 'three-col-33' }
      }
    }

    return null
  }

  // Helper to determine two-field groupings
  const getTwoFieldGroup = (field1: SportFieldDefinition, field2: SportFieldDefinition): { className: string } | null => {
    if (!field2) return null

    // Phone and extension
    if (field1.field_key === 'phone' && field2.field_key === 'extension') {
      return { className: 'two-col-75-25' }
    }

    // Height feet and inches
    if (field1.field_key === 'height_feet' && field2.field_key === 'height_inches') {
      return { className: 'two-col-equal' }
    }

    // Shoe size and width
    if (field1.field_key === 'shoe_size' && field2.field_key === 'shoe_width') {
      return { className: 'two-col-60-40' }
    }

    // Jersey and shorts size
    if (field1.field_key === 'jersey_size' && field2.field_key === 'shorts_size') {
      return { className: 'two-col-equal' }
    }

    // Primary and secondary position
    if (field1.field_key === 'primary_position' && field2.field_key === 'secondary_position') {
      return { className: 'two-col-equal' }
    }

    // First and last name (if they appear in sport profiles)
    if (field1.field_key === 'first_name' && field2.field_key === 'last_name') {
      return { className: 'two-col-equal' }
    }

    // Baseball/Softball: glove_size_in + glove_type
    if ((field1.field_key === 'glove_size_in' && field2.field_key === 'glove_type') ||
        (field1.field_key === 'glove_size' && field2.field_key === 'glove_type')) {
      return { className: 'two-col-60-40' }
    }

    // Baseball/Softball: bat_length_in + bat_weight_oz
    if (field1.field_key === 'bat_length_in' && field2.field_key === 'bat_weight_oz') {
      return { className: 'two-col-equal' }
    }

    // Baseball/Softball: pants_waist + pants_inseam (before pants_fit)
    if ((field1.field_key === 'pants_waist' && field2.field_key === 'pants_inseam') ||
        (field1.field_key === 'pants_waist_in' && field2.field_key === 'pants_inseam_in')) {
      return { className: 'two-col-equal' }
    }

    // Football tackle: helmet_size_circumference + helmet_brand_pref
    if (field1.field_key === 'helmet_size_circumference' && field2.field_key === 'helmet_brand_pref') {
      return { className: 'two-col-60-40' }
    }

    // Football tackle: shoulder_pad_size + shoulder_pad_style
    if (field1.field_key === 'shoulder_pad_size' && field2.field_key === 'shoulder_pad_style') {
      return { className: 'two-col-60-40' }
    }

    // Football tackle: cleat_size + cleat_style
    if (field1.field_key === 'cleat_size' && field2.field_key === 'cleat_style') {
      return { className: 'two-col-60-40' }
    }

    // Football tackle: gloves_size + gloves_type
    if (field1.field_key === 'gloves_size' && field2.field_key === 'gloves_type') {
      return { className: 'two-col-60-40' }
    }

    // Football tackle: pants_waist + pants_inseam
    if (field1.field_key === 'pants_waist' && field2.field_key === 'pants_inseam') {
      return { className: 'two-col-equal' }
    }

    // Ice hockey: skate_size + skate_width
    if (field1.field_key === 'skate_size' && field2.field_key === 'skate_width') {
      return { className: 'two-col-60-40' }
    }

    // Ice hockey: helmet_size + cage_visor_pref
    if (field1.field_key === 'helmet_size' && field2.field_key === 'cage_visor_pref') {
      return { className: 'two-col-60-40' }
    }

    // Ice hockey: stick_length_in + stick_flex
    if (field1.field_key === 'stick_length_in' && field2.field_key === 'stick_flex') {
      return { className: 'two-col-60-40' }
    }

    // Ice hockey: jersey_size + practice_jersey_size
    if (field1.field_key === 'jersey_size' && field2.field_key === 'practice_jersey_size') {
      return { className: 'two-col-equal' }
    }

    // Soccer: cleat_size + cleat_type_pref
    if (field1.field_key === 'cleat_size' && field2.field_key === 'cleat_type_pref') {
      return { className: 'two-col-60-40' }
    }

    // Soccer: shin_guard_size + shin_guard_style
    if (field1.field_key === 'shin_guard_size' && field2.field_key === 'shin_guard_style') {
      return { className: 'two-col-60-40' }
    }

    // Soccer: jersey_size + shorts_size
    if (field1.field_key === 'jersey_size' && field2.field_key === 'shorts_size') {
      return { className: 'two-col-equal' }
    }

    // Soccer: warmup_jacket_size + warmup_pants_size
    if (field1.field_key === 'warmup_jacket_size' && field2.field_key === 'warmup_pants_size') {
      return { className: 'two-col-equal' }
    }

    // Tennis: racquet_grip_size + racquet_head_size_pref
    if (field1.field_key === 'racquet_grip_size' && field2.field_key === 'racquet_head_size_pref') {
      return { className: 'two-col-60-40' }
    }

    // Tennis: shoe_size + shoe_width
    if (field1.field_key === 'shoe_size' && field2.field_key === 'shoe_width') {
      return { className: 'two-col-60-40' }
    }

    // Tennis: warmup_jacket_size + warmup_pants_size
    if (field1.field_key === 'warmup_jacket_size' && field2.field_key === 'warmup_pants_size') {
      return { className: 'two-col-equal' }
    }

    // Volleyball: shoe_size + shoe_width
    if (field1.field_key === 'shoe_size' && field2.field_key === 'shoe_width') {
      return { className: 'two-col-60-40' }
    }

    // Volleyball: spandex_size + spandex_length_pref
    if (field1.field_key === 'spandex_size' && field2.field_key === 'spandex_length_pref') {
      return { className: 'two-col-60-40' }
    }

    // Volleyball: warmup_jacket_size + warmup_pants_size
    if (field1.field_key === 'warmup_jacket_size' && field2.field_key === 'warmup_pants_size') {
      return { className: 'two-col-equal' }
    }

    // Basketball: jersey_size + shorts_size
    if (field1.field_key === 'jersey_size' && field2.field_key === 'shorts_size') {
      return { className: 'two-col-equal' }
    }

    // Basketball: shoe_size + shoe_width
    if (field1.field_key === 'shoe_size' && field2.field_key === 'shoe_width') {
      return { className: 'two-col-60-40' }
    }

    // Cheerleading/Poms: uniform_top_size + uniform_bottom_size
    if (field1.field_key === 'uniform_top_size' && field2.field_key === 'uniform_bottom_size') {
      return { className: 'two-col-equal' }
    }

    // Cheerleading/Poms: warmup_jacket_size + warmup_pants_size
    if (field1.field_key === 'warmup_jacket_size' && field2.field_key === 'warmup_pants_size') {
      return { className: 'two-col-equal' }
    }

    // Swimming/Diving: competition_suit_size + practice_suit_size
    if (field1.field_key === 'competition_suit_size' && field2.field_key === 'practice_suit_size') {
      return { className: 'two-col-equal' }
    }

    // Gymnastics: competition_leotard_size + practice_leotard_size
    if (field1.field_key === 'competition_leotard_size' && field2.field_key === 'practice_leotard_size') {
      return { className: 'two-col-equal' }
    }

    // Gymnastics: grip_size + grip_dowel_size
    if (field1.field_key === 'grip_size' && field2.field_key === 'grip_dowel_size') {
      return { className: 'two-col-equal' }
    }

    // Golf: glove_size + glove_hand
    if (field1.field_key === 'glove_size' && field2.field_key === 'glove_hand') {
      return { className: 'two-col-60-40' }
    }

    // Golf: pants_size + pants_inseam
    if (field1.field_key === 'pants_size' && field2.field_key === 'pants_inseam') {
      return { className: 'two-col-equal' }
    }

    // Cross country/Track: singlet_size + shorts_size
    if (field1.field_key === 'singlet_size' && field2.field_key === 'shorts_size') {
      return { className: 'two-col-equal' }
    }

    // Cross country: racing_shoe_size + training_shoe_size
    if (field1.field_key === 'racing_shoe_size' && field2.field_key === 'training_shoe_size') {
      return { className: 'two-col-equal' }
    }

    // Track: sprint_spike_size + distance_spike_size
    if (field1.field_key === 'sprint_spike_size' && field2.field_key === 'distance_spike_size') {
      return { className: 'two-col-equal' }
    }

    // Track: warmup_jacket_size + warmup_pants_size
    if (field1.field_key === 'warmup_jacket_size' && field2.field_key === 'warmup_pants_size') {
      return { className: 'two-col-equal' }
    }

    // Wrestling: warmup_jacket_size + warmup_pants_size
    if (field1.field_key === 'warmup_jacket_size' && field2.field_key === 'warmup_pants_size') {
      return { className: 'two-col-equal' }
    }

    // Field hockey: jersey_size + skirt_shorts_size
    if (field1.field_key === 'jersey_size' && field2.field_key === 'skirt_shorts_size') {
      return { className: 'two-col-equal' }
    }

    // Field hockey: cleat_size + turf_shoe_size
    if (field1.field_key === 'cleat_size' && field2.field_key === 'turf_shoe_size') {
      return { className: 'two-col-equal' }
    }

    // Lacrosse: jersey_size + shorts_size
    if (field1.field_key === 'jersey_size' && field2.field_key === 'shorts_size') {
      return { className: 'two-col-equal' }
    }

    // Lacrosse: helmet_size + shoulder_pad_size
    if (field1.field_key === 'helmet_size' && field2.field_key === 'shoulder_pad_size') {
      return { className: 'two-col-equal' }
    }

    // General: two small size fields in sequence (equal width)
    const sizeFieldPattern = /_(size|length|width|height|inseam|waist)$/
    if (sizeFieldPattern.test(field1.field_key) && sizeFieldPattern.test(field2.field_key)) {
      const shortFieldTypes = ['text', 'enum', 'int', 'numeric']
      if (shortFieldTypes.includes(field1.field_type) && shortFieldTypes.includes(field2.field_type)) {
        return { className: 'two-col-equal' }
      }
    }

    return null
  }

  // Loading state
  if (fieldsLoading || profileLoading) {
    return (
      <Card className="p-6">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading sport profile...</p>
      </Card>
    )
  }

  // Error state
  if (fieldsError) {
    return (
      <Card className="p-6">
        <div className="form-error-banner">
          <span className="material-symbols-outlined">error</span>
          <span>{fieldsError.message}</span>
        </div>
      </Card>
    )
  }

  // No fields state
  if (profileFields.length === 0 && equipmentFields.length === 0) {
    return (
      <Card className="p-6">
        <div className="empty-icon">sports</div>
        <p className="empty-text">No profile fields configured for this sport</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <CardTitle className="mb-2">
          {sportCode.replace('_', ' ')} Profile
        </CardTitle>
        <p className="form-subtitle">
          Sport-specific details and equipment information
        </p>
      </div>

      {/* Tabs */}
      <div className="form-tabs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`form-tab ${activeTab === 'profile' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined form-tab-icon">person</span>
          Profile
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`form-tab ${activeTab === 'equipment' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined form-tab-icon">inventory_2</span>
          Equipment
        </button>
      </div>

      {/* Error banner */}
      {profileError && (
        <div className="form-error-banner">
          <span className="material-symbols-outlined">error</span>
          <span>{profileError.message}</span>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="form-fields">
          {profileFields.length === 0 ? (
            <div className="profile-form-empty">
              <span className="material-symbols-outlined empty-icon">person</span>
              <p className="empty-text">No profile fields configured</p>
            </div>
          ) : (
            renderFieldsWithLayout(profileFields, profileData, handleProfileFieldChange, profileErrors, updating)
          )}
        </div>
      )}

      {activeTab === 'equipment' && (
        <>
          {/* Info callout */}
          <div className="form-info-banner mb-6">
            <span className="material-symbols-outlined">info</span>
            <span>
              Accurate equipment information helps coaches prepare for the season and ensures proper fit.
            </span>
          </div>

          <div className="form-fields">
            {equipmentFields.length === 0 ? (
              <div className="equipment-form-empty">
                <span className="material-symbols-outlined empty-icon">inventory_2</span>
                <p className="empty-text">No equipment fields configured</p>
              </div>
            ) : (
              renderFieldsWithLayout(equipmentFields, equipmentData, handleEquipmentFieldChange, equipmentErrors, updating)
            )}
          </div>
        </>
      )}

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
              <span>Save</span>
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
    </Card>
  )
}