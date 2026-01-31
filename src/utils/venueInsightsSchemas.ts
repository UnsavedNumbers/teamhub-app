/**
 * Venue Insights Validation Schemas
 * 
 * Zod schemas for validating Place Details and Gemini API responses.
 * Used to ensure data integrity before storing in database.
 */

import { z } from 'zod'

// Photo reference schema
export const PhotoReferenceSchema = z.object({
  photo_reference: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  html_attributions: z.array(z.string()).optional(),
})

// Place Details API response schema
export const PlaceDetailsResponseSchema = z.object({
  place_id: z.string().min(1),
  name: z.string().optional(),
  formatted_address: z.string().optional(),
  photos: z.array(PhotoReferenceSchema).optional(),
  rating: z.number().min(0).max(5).optional(),
  user_ratings_total: z.number().int().nonnegative().optional(),
  types: z.array(z.string()).optional(),
  opening_hours: z.object({
    open_now: z.boolean().optional(),
    weekday_text: z.array(z.string()).optional(),
  }).optional(),
  website: z.string().url().optional().or(z.literal('')),
  international_phone_number: z.string().optional(),
  editorial_summary: z.object({
    overview: z.string().optional(),
  }).optional(),
  price_level: z.number().int().min(0).max(4).optional(),
  geometry: z.object({
    location: z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
    }).optional(),
  }).optional(),
  status: z.string().optional(),
})

// Gemini API response schema (for summary)
export const GeminiSummaryResponseSchema = z.object({
  text: z.string().min(1).max(500), // Max 500 chars for summary
})

// Gemini API response schema (for "what to expect")
export const GeminiTipsResponseSchema = z.object({
  text: z.string().min(1).max(1000), // Max 1000 chars for tips
})

// Validation result type
export interface ValidationResult<T> {
  valid: boolean
  error: string | null
  data: T | null
}

/**
 * Validate Place Details API response
 */
export function validatePlaceDetails(data: unknown): ValidationResult<z.infer<typeof PlaceDetailsResponseSchema>> {
  const result = PlaceDetailsResponseSchema.safeParse(data)
  if (!result.success) {
    console.error('Place Details validation failed:', result.error.issues, 'Raw data:', data)
    return {
      valid: false,
      error: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; '),
      data: null,
    }
  }
  return {
    valid: true,
    error: null,
    data: result.data,
  }
}

/**
 * Validate Gemini summary response
 */
export function validateGeminiSummary(data: unknown): ValidationResult<string> {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data
    const result = GeminiSummaryResponseSchema.safeParse(parsed)
    if (!result.success) {
      console.error('Gemini summary validation failed:', result.error.issues, 'Raw data:', data)
      return {
        valid: false,
        error: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; '),
        data: null,
      }
    }
    return {
      valid: true,
      error: null,
      data: result.data.text,
    }
  } catch (error) {
    console.error('Gemini summary parsing failed:', error, 'Raw data:', data)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      data: null,
    }
  }
}

/**
 * Validate Gemini tips response
 */
export function validateGeminiTips(data: unknown): ValidationResult<string> {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data
    const result = GeminiTipsResponseSchema.safeParse(parsed)
    if (!result.success) {
      console.error('Gemini tips validation failed:', result.error.issues, 'Raw data:', data)
      return {
        valid: false,
        error: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; '),
        data: null,
      }
    }
    return {
      valid: true,
      error: null,
      data: result.data.text,
    }
  } catch (error) {
    console.error('Gemini tips parsing failed:', error, 'Raw data:', data)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      data: null,
    }
  }
}
