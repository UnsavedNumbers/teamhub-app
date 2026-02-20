/**
 * Export Formatters
 *
 * Utilities for formatting data for CSV, XLSX, and PDF exports.
 */

import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import jsPDF from 'jspdf'

/**
 * Export data to CSV format
 */
export function exportToCSV(data: unknown[], filename: string): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Export data to XLSX format
 */
export function exportToXLSX(data: unknown[], filename: string, sheetName: string = 'Sheet1'): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Export data to PDF format
 */
export function exportToPDF(
  data: unknown[],
  filename: string,
  title: string,
  columns: string[]
): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const rowHeight = 7
  const startY = 30

  // Add title
  doc.setFontSize(16)
  doc.text(title, margin, startY)

  // Add date
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, startY + 10)

  let y = startY + 20

  // Add headers
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  const colWidth = (pageWidth - 2 * margin) / columns.length
  columns.forEach((col, index) => {
    doc.text(col, margin + index * colWidth, y)
  })

  y += rowHeight

  // Add data rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  data.forEach((row: any) => {
    // Check if we need a new page
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage()
      y = margin

      // Redraw headers on new page
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      columns.forEach((col, index) => {
        doc.text(col, margin + index * colWidth, y)
      })
      y += rowHeight
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
    }

    columns.forEach((col, index) => {
      const value = row[col] !== undefined && row[col] !== null ? String(row[col]) : ''
      doc.text(value, margin + index * colWidth, y)
    })
    y += rowHeight
  })

  doc.save(`${filename}.pdf`)
}

/**
 * Format data for export (flatten nested objects, handle dates, etc.)
 */
export function formatDataForExport(data: unknown[]): Record<string, unknown>[] {
  return data.map((item: any) => {
    const flattened: Record<string, unknown> = {}
    
    const flatten = (obj: any, prefix = '') => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const newKey = prefix ? `${prefix}.${key}` : key
          const value = obj[key]
          
          if (value === null || value === undefined) {
            flattened[newKey] = ''
          } else if (typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
            flatten(value, newKey)
          } else if (value instanceof Date) {
            flattened[newKey] = value.toISOString().split('T')[0]
          } else if (Array.isArray(value)) {
            flattened[newKey] = value.join(', ')
          } else {
            flattened[newKey] = value
          }
        }
      }
    }
    
    flatten(item)
    return flattened
  })
}
