/**
 * Attendance Reports Utilities
 * 
 * Functions for generating CSV and PDF reports from attendance data.
 */

import Papa from 'papaparse'
import type { AttendanceEventSummary, AttendancePersonSummary } from '../types/attendance'

/**
 * Generate CSV file from data and trigger download
 */
function downloadCSV(data: unknown[], filename: string): void {
  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Generate Organization Summary CSV
 * Includes attendance breakdown by team and season
 */
export function generateOrganizationSummaryCSV(
  events: AttendanceEventSummary[]
): void {
  const rows = events.map(event => ({
    'Team Name': event.team_name,
    'Event Type': event.event_type,
    'Date': new Date(event.start_time).toLocaleDateString('en-US'),
    'Time': new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    'Location': event.location_name,
    'Total Expected': event.total_expected,
    'Present': event.present_count,
    'Absent': event.absent_count,
    'Late': event.late_count,
    'Excused': event.excused_count,
    'Unknown': event.unknown_count,
    'Status': event.status,
  }))

  const filename = `attendance-organization-summary-${new Date().toISOString().split('T')[0]}.csv`
  downloadCSV(rows, filename)
}

/**
 * Generate Missing Attendance Report CSV
 * Lists events where attendance has not been submitted
 */
export function generateMissingAttendanceCSV(
  events: AttendanceEventSummary[]
): void {
  const missingEvents = events.filter(e => e.status === 'missing')
  
  const rows = missingEvents.map(event => ({
    'Team Name': event.team_name,
    'Event Type': event.event_type,
    'Date': new Date(event.start_time).toLocaleDateString('en-US'),
    'Time': new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    'Location': event.location_name,
    'Expected Roster Size': event.total_expected || 'Unknown',
  }))

  const filename = `attendance-missing-report-${new Date().toISOString().split('T')[0]}.csv`
  downloadCSV(rows, filename)
}

/**
 * Generate At-Risk Players CSV
 * Lists players with attendance below threshold
 */
export function generateAtRiskPlayersCSV(
  people: AttendancePersonSummary[]
): void {
  const atRisk = people.filter(p => p.risk_level === 'at_risk' || p.risk_level === 'watch')
  
  const rows = atRisk.map(person => ({
    'First Name': person.first_name,
    'Last Name': person.last_name,
    'Teams': person.team_names.join(', ') || 'Unknown',
    'Total Events': person.total_events,
    'Present': person.present_count,
    'Absent': person.absent_count,
    'Late': person.late_count,
    'Excused': person.excused_count,
    'Attendance Rate': `${person.attendance_rate.toFixed(1)}%`,
    'Risk Level': person.risk_level === 'at_risk' ? 'At Risk' : 'Watch',
    'Last Attended': person.last_attended_date 
      ? new Date(person.last_attended_date).toLocaleDateString('en-US')
      : 'Never',
  }))

  const filename = `attendance-at-risk-players-${new Date().toISOString().split('T')[0]}.csv`
  downloadCSV(rows, filename)
}

/**
 * Generate At-Risk Players PDF
 * Creates a simple PDF report (requires jsPDF library)
 * Falls back to CSV if jsPDF is not available
 */
export async function generateAtRiskPlayersPDF(
  people: AttendancePersonSummary[]
): Promise<void> {
  // Check if jsPDF is available
  try {
    // Dynamic import to avoid breaking if library not installed
    // @ts-ignore - optional dependency
    const { default: jsPDF } = await import(/* @vite-ignore */ 'jspdf')
    
    const doc = new jsPDF()
    const atRisk = people.filter(p => p.risk_level === 'at_risk' || p.risk_level === 'watch')
    
    // Set up PDF
    doc.setFontSize(16)
    doc.text('At-Risk Players Report', 14, 20)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 14, 30)
    
    // Add table data
    let yPos = 45
    const pageHeight = doc.internal.pageSize.height
    const lineHeight = 7
    
    // Headers
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Name', 14, yPos)
    doc.text('Teams', 60, yPos)
    doc.text('Rate', 120, yPos)
    doc.text('Risk', 140, yPos)
    doc.text('Last Attended', 160, yPos)
    
    yPos += lineHeight
    doc.setFont('helvetica', 'normal')
    
    // Data rows
    for (const person of atRisk.slice(0, 25)) { // Limit to 25 per page
      if (yPos > pageHeight - 20) {
        doc.addPage()
        yPos = 20
      }
      
      const fullName = `${person.first_name} ${person.last_name}`
      const teams = person.team_names.join(', ') || 'Unknown'
      const rate = `${person.attendance_rate.toFixed(1)}%`
      const risk = person.risk_level === 'at_risk' ? 'At Risk' : 'Watch'
      const lastAttended = person.last_attended_date 
        ? new Date(person.last_attended_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'Never'
      
      doc.text(fullName.substring(0, 30), 14, yPos)
      doc.text(teams.substring(0, 25), 60, yPos)
      doc.text(rate, 120, yPos)
      doc.text(risk, 140, yPos)
      doc.text(lastAttended, 160, yPos)
      
      yPos += lineHeight
    }
    
    // Add footer if more records exist
    if (atRisk.length > 25) {
      doc.setFontSize(8)
      doc.text(`Showing first 25 of ${atRisk.length} at-risk players. Export CSV for full list.`, 14, pageHeight - 10)
    }
    
    const filename = `attendance-at-risk-players-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
  } catch (err) {
    // Fallback to CSV if jsPDF not available
    console.warn('[attendanceReports] jsPDF not available, falling back to CSV')
    generateAtRiskPlayersCSV(people)
  }
}
