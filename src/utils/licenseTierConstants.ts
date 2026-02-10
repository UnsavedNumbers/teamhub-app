/**
 * License Tier Constants
 * 
 * Re-exports feature constants from a centralized location.
 * This file is kept for backward compatibility with existing imports.
 * New code should import directly from src/constants/features.ts
 */

import { FEATURE_CATEGORIES, FEATURE_TYPES } from '../constants/features'
import type { FeatureCategory, FeatureType } from '../types/licenseTiers.types'

// Re-export for backward compatibility
export { FEATURE_CATEGORIES, FEATURE_TYPES }
export type { FeatureCategory, FeatureType }
