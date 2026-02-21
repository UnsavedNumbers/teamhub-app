/**
 * Bulk Invite Validation Utilities
 * 
 * Utilities for validating bulk invite data, reusing existing validation functions
 * where possible to avoid duplication.
 */

import * as XLSX from 'xlsx'
import { normalizeEmail, validateGuardianEmail } from '@/data/services/guardianService'
import { normalizePhone, validatePhoneFormat } from '@/utils/phoneValidation'

export interface BulkInviteRow {
  rowNumber: number
  data: Record<string, string>
}

export interface BulkInviteData {
  orgAdmins: BulkInviteRow[]
  coaches: BulkInviteRow[]
  guardians: BulkInviteRow[]
  athletes: BulkInviteRow[]
}

export interface ValidationError {
  sheet: string
  row: number
  field?: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Parse XLSX file into structured data
 */
export function parseBulkInviteFile(file: File): Promise<BulkInviteData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const result: BulkInviteData = {
          orgAdmins: [],
          coaches: [],
          guardians: [],
          athletes: [],
        }

        const sheetMap: Record<string, keyof BulkInviteData> = {
          'Org Admins': 'orgAdmins',
          'Coaches': 'coaches',
          'Guardians': 'guardians',
          'Athletes': 'athletes',
        }

        for (const sheetName of workbook.SheetNames) {
          const key = sheetMap[sheetName]
          if (!key) continue

          const worksheet = workbook.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
            defval: '',
            raw: false,
          })

          result[key] = rows
            .map((row, index) => ({
              rowNumber: index + 2, // Excel row number (1-indexed + header)
              data: row,
            }))
            .filter((row) =>
              Object.values(row.data).some((v) => v && String(v).trim() !== '')
            )
        }

        resolve(result)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Validate sheet structure (sheet names and required columns)
 */
export function validateSheetStructure(workbook: XLSX.WorkBook): ValidationError[] {
  const errors: ValidationError[] = []
  const requiredSheets = ['Org Admins', 'Coaches', 'Guardians', 'Athletes']
  const requiredColumns: Record<string, string[]> = {
    'Org Admins': ['first_name', 'last_name', 'phone', 'email'],
    'Coaches': ['first_name', 'last_name', 'phone', 'email'],
    'Guardians': ['first_name', 'last_name', 'phone', 'email'],
    'Athletes': ['first_name', 'last_name', 'phone', 'email', 'guardian_email'],
  }

  // Check for required sheets
  for (const sheetName of requiredSheets) {
    if (!workbook.SheetNames.includes(sheetName)) {
      errors.push({
        sheet: sheetName,
        row: 0,
        message: `Missing required sheet: ${sheetName}`,
        severity: 'error',
      })
    }
  }

  // Check for required columns in each sheet
  for (const sheetName of requiredSheets) {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) continue

    const headers: string[] = []
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      const cell = worksheet[cellAddress]
      if (cell && cell.v) {
        headers.push(String(cell.v).trim().toLowerCase())
      }
    }

    const required = requiredColumns[sheetName] || []
    for (const col of required) {
      if (!headers.includes(col.toLowerCase())) {
        errors.push({
          sheet: sheetName,
          row: 0,
          field: col,
          message: `Missing required column: ${col}`,
          severity: 'error',
        })
      }
    }
  }

  return errors
}

/**
 * Validate email format (reuses existing function)
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  return validateGuardianEmail(email.trim())
}

/**
 * Normalize email (reuses existing function)
 */
export function normalizeEmailForBulkInvite(email: string): string {
  if (!email || typeof email !== 'string') return ''
  return normalizeEmail(email.trim())
}

/**
 * Validate phone format (reuses existing function)
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false
  const result = validatePhoneFormat(phone.trim())
  return result.valid
}

/**
 * Normalize phone (reuses existing function)
 */
export function normalizePhoneForBulkInvite(phone: string): string {
  if (!phone || typeof phone !== 'string') return ''
  return normalizePhone(phone.trim())
}

/**
 * Validate a single row
 */
export function validateRow(
  row: BulkInviteRow,
  sheetName: string,
  requiredFields: string[]
): ValidationError[] {
  const errors: ValidationError[] = []
  const data = row.data

  // Check required fields
  for (const field of requiredFields) {
    const value = String(data[field] || '').trim()
    if (!value) {
      errors.push({
        sheet: sheetName,
        row: row.rowNumber,
        field,
        message: `Required field ${field} is empty`,
        severity: 'error',
      })
    }
  }

  // Validate email if present
  const email = String(data.email || '').trim()
  if (email && !validateEmail(email)) {
    errors.push({
      sheet: sheetName,
      row: row.rowNumber,
      field: 'email',
      message: `Invalid email format: ${email}`,
      severity: 'error',
    })
  }

  // Validate phone if present
  const phone = String(data.phone || '').trim()
  if (phone && !validatePhone(phone)) {
    errors.push({
      sheet: sheetName,
      row: row.rowNumber,
      field: 'phone',
      message: `Phone format may be invalid: ${phone}`,
      severity: 'warning',
    })
  }

  return errors
}
