/**
 * Uniform Field Configurations
 * 
 * Sport-specific field definitions for uniforms.
 * Each sport has its own set of visible parts and fields.
 */

import type { SportUniformConfig } from '../types/uniforms'

export const UNIFORM_FIELD_CONFIGS: Record<string, SportUniformConfig> = {
  soccer: {
    visibleParts: ['jersey', 'shorts', 'socks'],
    fields: [
      { key: 'jersey_number', label: 'Jersey Number', type: 'number', required: true },
      { key: 'jersey_fit', label: 'Jersey Fit', type: 'select', options: ['youth', 'adult'], required: false },
      { key: 'sock_color', label: 'Sock Color', type: 'color', required: false },
      { key: 'home_away', label: 'Home/Away', type: 'select', options: ['home', 'away'], required: true },
    ],
    optionalSections: [
      {
        key: 'goalie_uniform',
        label: 'Goalie Uniform',
        fields: [
          { key: 'goalie_jersey_color', label: 'Goalie Jersey Color', type: 'color', required: false },
          { key: 'goalie_numbering_rules', label: 'Goalie Numbering Rules', type: 'text', required: false },
        ],
      },
    ],
  },
  basketball: {
    visibleParts: ['jersey', 'shorts'],
    fields: [
      { key: 'jersey_number', label: 'Jersey Number', type: 'number', required: true },
      { key: 'home_away', label: 'Home/Away', type: 'select', options: ['home', 'away'], required: true },
      { key: 'reversible_toggle', label: 'Reversible Uniform', type: 'toggle', required: false },
    ],
    optionalSections: [
      {
        key: 'practice_jersey',
        label: 'Practice Jersey',
        fields: [
          { key: 'practice_jersey_color', label: 'Practice Jersey Color', type: 'color', required: false },
        ],
      },
    ],
  },
  baseball: {
    visibleParts: ['jersey', 'pants', 'hat', 'belt', 'socks'],
    fields: [
      { key: 'jersey_number', label: 'Jersey Number', type: 'number', required: true },
      { key: 'jersey_style', label: 'Jersey Style', type: 'select', options: ['button-down', 'pullover'], required: false },
      { key: 'pant_color', label: 'Pant Color', type: 'color', required: false },
      { key: 'hat_logo_indicator', label: 'Hat Logo Indicator', type: 'text', required: false },
      { key: 'home_away', label: 'Home/Away', type: 'select', options: ['home', 'away'], required: false },
    ],
    optionalSections: [
      {
        key: 'alternate_hat',
        label: 'Alternate Hat',
        fields: [
          { key: 'alternate_hat_color', label: 'Alternate Hat Color', type: 'color', required: false },
        ],
      },
    ],
  },
  softball: {
    visibleParts: ['jersey', 'pants', 'hat', 'belt', 'socks'],
    fields: [
      { key: 'jersey_number', label: 'Jersey Number', type: 'number', required: true },
      { key: 'jersey_style', label: 'Jersey Style', type: 'select', options: ['button-down', 'pullover'], required: false },
      { key: 'pant_color', label: 'Pant Color', type: 'color', required: false },
      { key: 'hat_logo_indicator', label: 'Hat Logo Indicator', type: 'text', required: false },
      { key: 'home_away', label: 'Home/Away', type: 'select', options: ['home', 'away'], required: false },
    ],
    optionalSections: [
      {
        key: 'alternate_hat',
        label: 'Alternate Hat',
        fields: [
          { key: 'alternate_hat_color', label: 'Alternate Hat Color', type: 'color', required: false },
        ],
      },
    ],
  },
  football: {
    visibleParts: ['jersey', 'pants', 'socks'],
    fields: [
      { key: 'jersey_number', label: 'Jersey Number', type: 'number', required: true },
      { key: 'practice_vs_game', label: 'Practice vs Game', type: 'select', options: ['practice', 'game'], required: true },
      { key: 'home_away', label: 'Home/Away', type: 'select', options: ['home', 'away'], required: false },
    ],
    optionalSections: [
      {
        key: 'position_numbering_rules',
        label: 'Position Numbering Rules',
        fields: [
          { key: 'position_rules', label: 'Position Rules', type: 'text', required: false },
        ],
      },
      {
        key: 'alternate_pants',
        label: 'Alternate Pants',
        fields: [
          { key: 'alternate_pant_color', label: 'Alternate Pant Color', type: 'color', required: false },
        ],
      },
    ],
  },
  volleyball: {
    visibleParts: ['jersey', 'shorts'],
    fields: [
      { key: 'jersey_number', label: 'Jersey Number', type: 'number', required: true },
      { key: 'libero_designation', label: 'Libero Designation', type: 'toggle', required: false },
      { key: 'sleeve_length', label: 'Sleeve Length', type: 'select', options: ['short', 'long'], required: false },
    ],
    optionalSections: [
      {
        key: 'knee_pad_color',
        label: 'Knee Pad Color (Informational)',
        fields: [
          { key: 'knee_pad_color', label: 'Knee Pad Color', type: 'color', required: false },
        ],
      },
    ],
  },
  lacrosse: {
    visibleParts: ['jersey', 'shorts', 'skirt'],
    fields: [
      { key: 'jersey_number', label: 'Jersey Number', type: 'number', required: true },
      { key: 'home_away', label: 'Home/Away', type: 'select', options: ['home', 'away'], required: true },
      { key: 'program_based_cut', label: 'Program-Based Cut', type: 'select', options: ['boys', 'girls'], required: false },
    ],
    optionalSections: [
      {
        key: 'alternate_pinnies',
        label: 'Alternate Pinnies for Practice',
        fields: [
          { key: 'pinnie_color', label: 'Pinnie Color', type: 'color', required: false },
        ],
      },
    ],
  },
  'track-field': {
    visibleParts: ['singlet', 'shorts'],
    fields: [
      { key: 'event_type', label: 'Event Type', type: 'select', options: ['track', 'field'], required: false },
      { key: 'jersey_number', label: 'Jersey Number', type: 'number', required: false },
      { key: 'heat_meet_designation', label: 'Heat/Meet Designation', type: 'text', required: false },
    ],
    hiddenFields: ['home_away'],
  },
  'cross-country': {
    visibleParts: ['singlet', 'shorts'],
    fields: [
      { key: 'event_type', label: 'Event Type', type: 'select', options: ['cross-country'], required: false },
      { key: 'jersey_number', label: 'Jersey Number', type: 'number', required: false },
      { key: 'heat_meet_designation', label: 'Heat/Meet Designation', type: 'text', required: false },
    ],
    hiddenFields: ['home_away'],
  },
}

/**
 * Get field configuration for a sport
 */
export function getUniformConfigForSport(sportName: string): SportUniformConfig | null {
  // Normalize sport name (lowercase, handle variations)
  const normalized = sportName.toLowerCase().replace(/\s+/g, '-')
  return UNIFORM_FIELD_CONFIGS[normalized] || null
}

/**
 * Get all available sports with uniform configurations
 */
export function getSportsWithUniformConfigs(): string[] {
  return Object.keys(UNIFORM_FIELD_CONFIGS)
}
