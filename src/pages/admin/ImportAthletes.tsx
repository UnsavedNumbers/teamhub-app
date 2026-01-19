import { useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { OrganizationStructurePageHeader } from '../../components/admin/OrganizationStructurePageHeader'
import { Button, Card, Input, Select } from '../../components/platformAdmin'
import { useUserContext } from '../../hooks/useUserContext'
import { supabase } from '../../lib/supabase'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { useT } from '../../i18n/useI18n'

// Template column definitions
const TEMPLATE_COLUMNS = {
  required: [
    { key: 'athlete_first_name', label: 'First Name', required: true },
    { key: 'athlete_last_name', label: 'Last Name', required: true },
    { key: 'athlete_date_of_birth', label: 'Date of Birth (YYYY-MM-DD)', required: true },
  ],
  optional: [
    { key: 'athlete_gender', label: 'Gender (male/female/nonbinary/unspecified)', required: false },
    { key: 'athlete_jersey_number', label: 'Jersey Number', required: false },
    { key: 'athlete_grade', label: 'Grade', required: false },
    { key: 'athlete_email', label: 'Athlete Email', required: false },
    { key: 'athlete_phone', label: 'Athlete Phone', required: false },
    { key: 'notes_medical', label: 'Medical Notes', required: false },
    { key: 'notes_allergies', label: 'Allergies', required: false },
    { key: 'guardian1_first_name', label: 'Guardian 1 First Name', required: false },
    { key: 'guardian1_last_name', label: 'Guardian 1 Last Name', required: false },
    { key: 'guardian1_email', label: 'Guardian 1 Email', required: false },
    { key: 'guardian1_phone', label: 'Guardian 1 Phone', required: false },
    { key: 'guardian2_first_name', label: 'Guardian 2 First Name', required: false },
    { key: 'guardian2_last_name', label: 'Guardian 2 Last Name', required: false },
    { key: 'guardian2_email', label: 'Guardian 2 Email', required: false },
    { key: 'guardian2_phone', label: 'Guardian 2 Phone', required: false },
    { key: 'team_name', label: 'Team Name', required: false },
    { key: 'season_name', label: 'Season Name', required: false },
    { key: 'membership_role', label: 'Membership Role (default: player)', required: false },
  ],
}

interface ParsedRow {
  row_number: number
  raw_data: Record<string, string>
  mapped_data: Record<string, string>
  status: 'ready' | 'warning' | 'error'
  errors: string[]
  warnings: string[]
  matched_athlete_id?: string
}

interface ImportResult {
  imported_count: number
  updated_count: number
  skipped_count: number
  error_count: number
  errors: Array<{ row_number: number; message: string }>
}

// Toggle Switch Component matching design
function ToggleSwitch({ checked, onChange, label, description }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-background-dark/50 border border-white/5">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        {description && <p className="text-[10px] text-[#92adc9]">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
          checked ? 'bg-primary' : 'bg-white/10'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function ImportAthletes() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { context, isReady } = useUserContext()
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const preSelectedTeamId = searchParams.get('teamId') || null
  const preSelectedSeasonId = searchParams.get('seasonId') || null

  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(0)
  const rowsPerPage = 50
  const [showErrorsOnly, setShowErrorsOnly] = useState(false)
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    autoAssignTeams: false,
    destinationTeam: preSelectedTeamId || '',
    importMode: 'create_only' as 'create_only' | 'update_and_create' | 'update_only',
    createFamilies: true,
    linkExistingFamilies: true,
  })
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMappingModal, setShowMappingModal] = useState(false)

  // Download CSV template
  const downloadCSVTemplate = useCallback(() => {
    const headers = [
      ...TEMPLATE_COLUMNS.required.map(c => c.key),
      ...TEMPLATE_COLUMNS.optional.map(c => c.key),
    ]
    const csv = headers.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'athlete_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    const validExtensions = ['.csv', '.xls', '.xlsx']
    const fileExtension = uploadedFile.name.substring(uploadedFile.name.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload a CSV or XLSX file.')
      return
    }

    if (uploadedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.')
      return
    }

    setFile(uploadedFile)
    setError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        let rows: Record<string, string>[] = []

        if (fileExtension === '.csv') {
          const text = event.target?.result as string
          const result = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
          })
          rows = result.data
        } else {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
            defval: '',
            raw: false,
          })
        }

        rows = rows.filter(row => Object.values(row).some(val => val && val.toString().trim() !== ''))

        if (rows.length > 2000) {
          setError(`File contains ${rows.length} rows. Maximum allowed is 2,000 rows.`)
          return
        }

        // Auto-detect column mapping
        const detectedHeaders = Object.keys(rows[0] || {})
        const autoMapping: Record<string, string> = {}

        const allColumns = [...TEMPLATE_COLUMNS.required, ...TEMPLATE_COLUMNS.optional]
        for (const templateCol of allColumns) {
          const match = detectedHeaders.find(
            h => h.toLowerCase().replace(/[^a-z0-9]/g, '') === templateCol.key.toLowerCase().replace(/[^a-z0-9]/g, '')
          )
          if (match) {
            autoMapping[match] = templateCol.key
          }
        }

        setColumnMapping(autoMapping)
        processRows(rows, autoMapping)
      } catch (err) {
        setError(`Error parsing file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    if (fileExtension === '.csv') {
      reader.readAsText(uploadedFile)
    } else {
      reader.readAsArrayBuffer(uploadedFile)
    }
  }, [])

  // Process and validate rows
  const processRows = useCallback((rows: Record<string, string>[], mapping: Record<string, string>) => {
    const processed: ParsedRow[] = []
    const seenKeys = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2

      const mapped: Record<string, string> = {}
      for (const [sourceCol, targetCol] of Object.entries(mapping)) {
        mapped[targetCol] = row[sourceCol]?.trim() || ''
      }

      const errors: string[] = []
      const warnings: string[] = []

      if (!mapped.athlete_first_name) errors.push('Missing first name')
      if (!mapped.athlete_last_name) errors.push('Missing last name')
      if (!mapped.athlete_date_of_birth) {
        errors.push('Missing date of birth')
      } else {
        const dobMatch = mapped.athlete_date_of_birth.match(/^\d{4}-\d{2}-\d{2}$/)
        if (!dobMatch) {
          errors.push('Invalid date format. Use YYYY-MM-DD')
        } else {
          const dob = new Date(mapped.athlete_date_of_birth)
          if (isNaN(dob.getTime())) {
            errors.push('Invalid date')
          } else if (dob > new Date()) {
            errors.push('Date of birth cannot be in the future')
          }
        }
      }

      if (mapped.athlete_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.athlete_email)) {
        errors.push('Invalid email format')
      }

      if (mapped.athlete_gender) {
        const validGenders = ['male', 'female', 'nonbinary', 'unspecified']
        if (!validGenders.includes(mapped.athlete_gender.toLowerCase())) {
          warnings.push('Gender should be one of: male, female, nonbinary, unspecified')
        }
      }

      const key = `${mapped.athlete_first_name}|${mapped.athlete_last_name}|${mapped.athlete_date_of_birth}`
      if (seenKeys.has(key)) {
        warnings.push('Duplicate row detected in file')
      } else {
        seenKeys.add(key)
      }

      let status: 'ready' | 'warning' | 'error' = 'ready'
      if (errors.length > 0) status = 'error'
      else if (warnings.length > 0) status = 'warning'

      processed.push({
        row_number: rowNumber,
        raw_data: row,
        mapped_data: mapped,
        status,
        errors,
        warnings,
      })
    }

    setParsedRows(processed)
  }, [])

  // Execute import
  const executeImport = useCallback(async () => {
    if (!isReady || !context.orgId) {
      setError('Organization context not available')
      return
    }

    if (parsedRows.filter(r => r.status === 'error').length > 0) {
      setError('Please fix all errors before importing')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const fileExt = file!.name.substring(file!.name.lastIndexOf('.'))
      const fileName = `imports/${context.orgId}/${Date.now()}${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('athlete-imports')
        .upload(fileName, file!, {
          contentType: file!.type,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`)
      }

      const { data: importRecord, error: importError } = await supabase
        .from('athlete_imports')
        .insert({
          org_id: context.orgId,
          created_by_user_id: context.userId,
          file_name: file!.name,
          file_path: fileName,
          file_size_bytes: file!.size,
          total_rows: parsedRows.length,
          status: 'pending',
        })
        .select()
        .single()

      if (importError) {
        throw new Error(`Failed to create import record: ${importError.message}`)
      }

      const rowsForRpc = parsedRows
        .filter(r => r.status !== 'error')
        .map(row => ({
          row_number: row.row_number,
          status: row.status,
          error_message: row.errors.join('; '),
          ...row.mapped_data,
        }))

      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'import_athletes_from_spreadsheet',
        {
          p_org_id: context.orgId,
          p_import_id: importRecord.id,
          p_rows: rowsForRpc,
          p_import_mode: importOptions.importMode,
          p_team_id: importOptions.destinationTeam || null,
          p_season_id: preSelectedSeasonId || null,
          p_assign_teams_from_spreadsheet: importOptions.autoAssignTeams,
          p_create_families: importOptions.createFamilies,
          p_link_existing_families: importOptions.linkExistingFamilies,
        }
      )

      if (rpcError) {
        throw new Error(`Import failed: ${rpcError.message}`)
      }

      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || 'Import failed')
      }

      setImportResult({
        imported_count: rpcResult.imported_count || 0,
        updated_count: rpcResult.updated_count || 0,
        skipped_count: rpcResult.skipped_count || 0,
        error_count: rpcResult.error_count || 0,
        errors: rpcResult.errors || [],
      })

      navigate('/admin/children', { state: { importSuccess: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }, [isReady, context, file, parsedRows, importOptions, preSelectedSeasonId, navigate])

  // Get detected headers from file
  const detectedHeaders = useMemo(() => {
    if (parsedRows.length === 0) return []
    return Object.keys(parsedRows[0].raw_data)
  }, [parsedRows])

  // Filtered and paginated rows
  const filteredRows = useMemo(() => {
    let filtered = parsedRows
    if (showErrorsOnly) {
      filtered = parsedRows.filter(r => r.status === 'error')
    }
    return filtered
  }, [parsedRows, showErrorsOnly])

  const paginatedRows = useMemo(() => {
    const start = currentPage * rowsPerPage
    return filteredRows.slice(start, start + rowsPerPage)
  }, [filteredRows, currentPage])

  // Summary stats
  const stats = useMemo(() => {
    return {
      total: parsedRows.length,
      ready: parsedRows.filter(r => r.status === 'ready').length,
      warnings: parsedRows.filter(r => r.status === 'warning').length,
      errors: parsedRows.filter(r => r.status === 'error').length,
    }
  }, [parsedRows])

  if (!isReady) return <AdminLoadingSpinner />

  // Initial upload page using import-athletes1 design
  if (!file || parsedRows.length === 0) {
    return (
      <div className="pa-root" style={{ backgroundColor: '#f6f7f8', minHeight: '100vh' }}>
        <style>{`
          .field-grid {
            background-image: 
              linear-gradient(to right, rgba(19, 127, 236, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(19, 127, 236, 0.05) 1px, transparent 1px);
            background-size: 40px 40px;
          }
        `}</style>
        <div className="relative flex min-h-screen w-full flex-col field-grid overflow-x-hidden">
          <main className="flex-1 flex flex-col items-center py-10 px-6">
            <div className="w-full max-w-[1000px] flex flex-col gap-10">
              {/* Page Heading */}
              <div className="flex flex-col gap-2">
                <p className="text-4xl font-black leading-tight tracking-[-0.033em] uppercase">Import Athletes</p>
                <p className="text-[#4c739a] text-base font-normal">
                  Follow the linear process to bring your roster into TeamHub. Supported formats: CSV, XLSX.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Step 1: File Upload */}
              <section className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold tracking-tight uppercase flex items-center gap-3">
                    <span className="flex items-center justify-center size-7 rounded bg-[#137fec] text-white text-xs font-black">1</span>
                    File Upload
                  </h2>
                  <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">Required</span>
                </div>
                <div className="p-8">
                  <div
                    className="flex flex-col items-center gap-6 rounded border-2 border-dashed border-[#137fec]/20 bg-[#137fec]/5 px-6 py-16 hover:bg-[#137fec]/10 transition-all cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const droppedFile = e.dataTransfer.files[0]
                      if (droppedFile) {
                        const fakeEvent = {
                          target: { files: [droppedFile] },
                        } as React.ChangeEvent<HTMLInputElement>
                        handleFileUpload(fakeEvent)
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="material-symbols-outlined text-4xl text-[#137fec]">cloud_upload</span>
                      <div>
                        <p className="text-lg font-bold">Drag and drop athlete roster</p>
                        <p className="text-sm text-[#4c739a]">Max file size 5MB. CSV, XLSX only.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="flex min-w-[140px] items-center justify-center rounded h-11 px-6 bg-[#137fec] text-white text-sm font-bold tracking-wide uppercase transition-transform active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation()
                        fileInputRef.current?.click()
                      }}
                    >
                      Select File
                    </button>
                  </div>
                </div>
              </section>

              {/* Step 2: Column Mapping (Locked until file uploaded) */}
              <section className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden opacity-60 grayscale-[0.5]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h2 className="text-lg font-bold tracking-tight uppercase flex items-center gap-3">
                    <span className="flex items-center justify-center size-7 rounded bg-slate-400 text-white text-xs font-black">2</span>
                    Column Mapping
                  </h2>
                  <span className="material-symbols-outlined text-slate-400">lock</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">
                        <th className="px-6 py-3">Source Column (From File)</th>
                        <th className="px-6 py-3">TeamHub Field (Target)</th>
                        <th className="px-6 py-3">Sample Data</th>
                        <th className="px-6 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      <tr>
                        <td className="px-6 py-4 font-bold text-slate-400">First_Name</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 border border-slate-200 rounded px-3 py-2 bg-slate-50 w-full max-w-xs">
                            <span className="flex-1 text-slate-400 italic">Select destination...</span>
                            <span className="material-symbols-outlined text-sm text-slate-400">expand_more</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 italic">&quot;Jordan&quot;, &quot;Alex&quot;...</td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter bg-slate-100 text-slate-400">
                            Pending
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Step 3: Preview + Validation (Locked until file uploaded) */}
              <section className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden opacity-60 grayscale-[0.5]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold tracking-tight uppercase flex items-center gap-3">
                    <span className="flex items-center justify-center size-7 rounded bg-slate-400 text-white text-xs font-black">3</span>
                    Preview + Validation
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">0 Ready</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full bg-amber-500"></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">0 Warnings</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full bg-rose-500"></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">0 Errors</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">
                        <th className="px-6 py-3 w-12">#</th>
                        <th className="px-6 py-3">Full Name</th>
                        <th className="px-6 py-3">Email Address</th>
                        <th className="px-6 py-3">Team Assignment</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                          Upload a file to see preview
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="h-24"></div>
            </div>
          </main>

          {/* Sticky Footer */}
          <footer className="fixed bottom-0 left-0 w-full bg-white border-t-2 border-[#137fec]/20 p-4 shadow-2xl z-[60]">
            <div className="max-w-[1000px] mx-auto flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Selected File</p>
                <p className="text-sm font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#137fec]">description</span>
                  {file ? file.name : 'No file selected'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/admin/children')}
                  className="px-6 py-2.5 rounded border border-slate-200 text-sm font-bold uppercase tracking-wide hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!file}
                  className="px-8 py-2.5 rounded bg-[#137fec] text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-[#137fec]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Import
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </div>
          </footer>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>
    )
  }

  // Main validation view matching design
  return (
    <div className="pa-root" style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white' }}>
      <OrganizationStructurePageHeader
        title="Import Athletes"
        subtitle="Validation Hero - Review and fix data before final import"
        pageName="Import Athletes"
        actions={
          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="sharp-btn flex items-center justify-center h-12 px-6 bg-[#233648] text-white text-sm font-bold uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-colors"
              style={{ borderRadius: '2px' }}
            >
              <span className="material-symbols-outlined mr-2 text-sm">upload_file</span>
              Re-upload CSV
            </button>
            <button
              onClick={executeImport}
              disabled={loading || stats.errors > 0}
              className="sharp-btn flex items-center justify-center h-12 px-8 bg-[#137fec] text-white text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_4px_0_0_#0e5fb3] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: '2px' }}
            >
              {loading ? 'Importing...' : 'Complete Import'}
            </button>
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      <main className="flex flex-col flex-1 px-10 py-8 max-w-[1400px] mx-auto w-full">
        {/* Sticky Summary Bar */}
        <div
          className="bg-[#0a0a0a]/80 border border-[#233648] rounded-xl p-6 mb-8 flex flex-wrap gap-8 items-center shadow-2xl"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex-1 min-w-[120px]">
            <p className="text-[#92adc9] text-xs font-bold uppercase tracking-widest mb-1">Total Rows</p>
            <p className="text-white text-3xl font-black">{stats.total}</p>
          </div>
          <div className="h-10 w-px bg-[#233648] hidden md:block"></div>
          <div className="flex-1 min-w-[150px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-[#137fec]"></span>
              <p className="text-[#137fec] text-xs font-bold uppercase tracking-widest">Ready to Import</p>
            </div>
            <p className="text-white text-3xl font-black">{stats.ready}</p>
          </div>
          <div className="flex-1 min-w-[150px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-amber-500"></span>
              <p className="text-amber-500 text-xs font-bold uppercase tracking-widest">Warnings</p>
            </div>
            <p className="text-white text-3xl font-black">{stats.warnings}</p>
          </div>
          <div className="flex-1 min-w-[150px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-red-500"></span>
              <p className="text-red-500 text-xs font-bold uppercase tracking-widest">Errors</p>
            </div>
            <p className="text-white text-3xl font-black">{stats.errors}</p>
          </div>
        </div>

        <div className="flex gap-8 flex-col lg:flex-row">
          {/* Data Preview Table Section */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#161616] rounded-xl border border-[#233648] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#233648] flex justify-between items-center bg-white/5">
              <h2 className="text-white text-sm font-bold uppercase tracking-widest">Data Preview + Validation</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowErrorsOnly(!showErrorsOnly)}
                  className="px-3 py-1 bg-[#233648] text-xs font-bold rounded text-white flex items-center gap-1 border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">filter_alt</span>
                  Filter Errors
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0a0a0a]/50">
                    <th className="px-6 py-4 text-xs font-bold text-[#92adc9] uppercase tracking-widest border-b border-[#233648]">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#92adc9] uppercase tracking-widest border-b border-[#233648]">First Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#92adc9] uppercase tracking-widest border-b border-[#233648]">Last Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#92adc9] uppercase tracking-widest border-b border-[#233648]">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#92adc9] uppercase tracking-widest border-b border-[#233648]">DOB</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#92adc9] uppercase tracking-widest border-b border-[#233648]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#233648]/50">
                  {paginatedRows.map(row => {
                    const isError = row.status === 'error'
                    const isWarning = row.status === 'warning'
                    return (
                      <tr
                        key={row.row_number}
                        className={`hover:bg-white/5 transition-colors ${
                          isError ? 'bg-red-500/5 hover:bg-red-500/10' : isWarning ? 'bg-amber-500/5 hover:bg-amber-500/10' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          {row.status === 'ready' && (
                            <span className="material-symbols-outlined text-[#137fec]" title="Ready to import">
                              check_circle
                            </span>
                          )}
                          {row.status === 'warning' && (
                            <span className="material-symbols-outlined text-amber-500" title={row.warnings.join(', ')}>
                              warning
                            </span>
                          )}
                          {row.status === 'error' && (
                            <span className="material-symbols-outlined text-red-500" title={row.errors.join(', ')}>
                              error
                            </span>
                          )}
                        </td>
                        <td className={`px-6 py-4 text-sm font-medium ${isWarning ? 'text-amber-400' : ''}`}>
                          {row.mapped_data.athlete_first_name}
                        </td>
                        <td className={`px-6 py-4 text-sm font-medium ${isWarning ? 'text-amber-400' : ''}`}>
                          {row.mapped_data.athlete_last_name}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isError && row.errors.some(e => e.includes('email')) ? (
                            <span className="text-red-400 border border-red-500/50 rounded bg-red-500/10 px-2 py-1">
                              {row.mapped_data.athlete_email}
                            </span>
                          ) : (
                            <span className="font-normal text-[#92adc9]">{row.mapped_data.athlete_email || '-'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-normal">
                          {row.mapped_data.athlete_date_of_birth
                            ? new Date(row.mapped_data.athlete_date_of_birth).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button className="text-[#92adc9] hover:text-white">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[#233648] flex justify-between items-center bg-[#0a0a0a]/30">
              <p className="text-xs text-[#92adc9]">
                Showing {paginatedRows.length} of {filteredRows.length} rows
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className={`p-1 rounded bg-[#233648] transition-colors ${
                    currentPage === 0
                      ? 'text-[#92adc9] opacity-50 cursor-not-allowed'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage * rowsPerPage + rowsPerPage >= filteredRows.length}
                  className={`p-1 rounded bg-[#233648] transition-colors ${
                    currentPage * rowsPerPage + rowsPerPage >= filteredRows.length
                      ? 'text-[#92adc9] opacity-50 cursor-not-allowed'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Import Options Sidebar */}
          <aside className="w-full lg:w-80 flex flex-col gap-6">
            <div className="bg-[#161616] border border-[#233648] rounded-xl p-6 shadow-xl">
              <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#137fec] text-sm">settings</span>
                Import Options
              </h3>
              <div className="space-y-4">
                <ToggleSwitch
                  checked={importOptions.skipDuplicates}
                  onChange={(checked) => setImportOptions(prev => ({ ...prev, skipDuplicates: checked }))}
                  label="Skip Duplicates"
                  description="Avoid double entries"
                />
                <ToggleSwitch
                  checked={importOptions.autoAssignTeams}
                  onChange={(checked) => setImportOptions(prev => ({ ...prev, autoAssignTeams: checked }))}
                  label="Auto-assign Teams"
                  description="Based on column 'Team'"
                />
                <div className="pt-2">
                  <label className="text-[10px] font-bold uppercase text-[#92adc9] tracking-widest block mb-2">
                    Destination Team
                  </label>
                  <select
                    value={importOptions.destinationTeam}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, destinationTeam: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-[#233648] rounded-lg text-sm px-3 py-2 text-white focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] outline-none"
                  >
                    <option value="">Select Team</option>
                    {/* Teams would be loaded from API */}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#161616] border border-[#233648] rounded-xl p-6 shadow-xl border-l-4 border-l-[#137fec]">
              <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-4">Field Mapping</h3>
              <div className="space-y-3">
                {TEMPLATE_COLUMNS.required.map(col => {
                  const mappedCol = Object.entries(columnMapping).find(([_, target]) => target === col.key)?.[0]
                  return (
                    <div key={col.key} className="flex justify-between items-center text-xs">
                      <span className="text-[#92adc9]">{col.label}</span>
                      <span className="text-white font-mono bg-white/5 px-1 rounded">
                        {mappedCol || 'unmapped'}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => setShowMappingModal(true)}
                className="w-full mt-4 py-2 text-xs font-bold uppercase text-[#137fec] border border-[#137fec]/20 hover:bg-[#137fec]/10 transition-colors rounded"
              >
                Edit Mappings
              </button>
            </div>

            {stats.errors > 0 && (
              <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-red-500">info</span>
                  <div>
                    <p className="text-sm font-bold text-red-200">Action Required</p>
                    <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
                      Please fix {stats.errors} error{stats.errors !== 1 ? 's' : ''} in the table before you can proceed
                      with the import.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
