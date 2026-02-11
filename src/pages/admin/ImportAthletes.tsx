import { useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { AdminPageHeader, Button, Card, Badge, Select } from '../../components/admin'
import { FileUpload } from '../../components/common/FileUpload'
import { useUserContext } from '../../hooks/useUserContext'
import { supabase } from '../../lib/supabase'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { getLink } from '../../utils/routes'
import { cn } from '../../utils/cn'
import '../../styles/orgAdmin.css'

// Type for RPC result
interface ImportAthletesResult {
  success: boolean
  error?: string
  imported_count: number
  updated_count: number
  skipped_count: number
  error_count: number
  errors: Array<{ row: number; message: string }>
}

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

export default function ImportAthletes() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { context, isReady } = useUserContext()

  const preSelectedTeamId = searchParams.get('teamId') || null
  const preSelectedSeasonId = searchParams.get('seasonId') || null

  const [step, setStep] = useState<'upload' | 'mapping' | 'validation'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-detect column mapping
  const autoDetectMapping = useCallback((detectedHeaders: string[]) => {
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
    return autoMapping
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
        if (targetCol) {
            mapped[targetCol] = row[sourceCol]?.trim() || ''
        }
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

  // Handle file upload
  const handleFileUpload = useCallback((uploadedFile: File | null) => {
    if (!uploadedFile) {
      setFile(null)
      setRawRows([])
      setParsedRows([])
      setStep('upload')
      return
    }

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

        const detectedHeaders = Object.keys(rows[0] || {})
        const autoMapping = autoDetectMapping(detectedHeaders)

        setColumnMapping(autoMapping)
        setRawRows(rows)
        setFile(uploadedFile)

        const requiredMapped = TEMPLATE_COLUMNS.required.every(col =>
          Object.values(autoMapping).includes(col.key)
        )

        if (requiredMapped && rows.length > 0) {
          processRows(rows, autoMapping)
          setStep('validation')
        } else {
          setStep('mapping')
        }
      } catch (err) {
        setError(`Error parsing file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    if (fileExtension === '.csv') {
      reader.readAsText(uploadedFile)
    } else {
      reader.readAsArrayBuffer(uploadedFile)
    }
  }, [autoDetectMapping, processRows])

  // Execute import
  const executeImport = useCallback(async () => {
    if (!isReady || !context.orgId || !file) {
      setError('Context or file missing')
      return
    }

    if (parsedRows.filter(r => r.status === 'error').length > 0) {
      setError('Please fix all errors before importing')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const fileExt = file.name.substring(file.name.lastIndexOf('.'))
      const fileName = `imports/${context.orgId}/${Date.now()}${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('athlete-imports')
        .upload(fileName, file, {
          contentType: file.type,
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
          file_name: file.name,
          file_path: fileName,
          file_size_bytes: file.size,
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
          p_team_id: importOptions.destinationTeam || undefined,
          p_season_id: preSelectedSeasonId || undefined,
          p_assign_teams_from_spreadsheet: importOptions.autoAssignTeams,
          p_create_families: importOptions.createFamilies,
          p_link_existing_families: importOptions.linkExistingFamilies,
        }
      )

      if (rpcError) {
        throw new Error(`Import failed: ${rpcError.message}`)
      }

      const result = rpcResult as unknown as ImportAthletesResult

      if (!result?.success) {
        throw new Error(result?.error || 'Import failed')
      }

      navigate(getLink('admin.athletes.list'), { state: { importSuccess: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }, [isReady, context, file, parsedRows, importOptions, preSelectedSeasonId, navigate])

  // Process data for displays
  const stats = useMemo(() => ({
    total: parsedRows.length,
    ready: parsedRows.filter(r => r.status === 'ready').length,
    warnings: parsedRows.filter(r => r.status === 'warning').length,
    errors: parsedRows.filter(r => r.status === 'error').length,
  }), [parsedRows])

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

  const detectedHeaders = useMemo(() => {
    if (rawRows.length === 0) return []
    return Object.keys(rawRows[0])
  }, [rawRows])

  const getSampleData = useCallback((columnName: string) => {
    if (rawRows.length === 0) return ''
    const samples = rawRows.slice(0, 3).map(row => row[columnName]).filter(Boolean)
    return samples.length > 0 ? `"${samples.join('", "')}"...` : ''
  }, [rawRows])

  const isMappingComplete = useMemo(() => {
    return TEMPLATE_COLUMNS.required.every(col => Object.values(columnMapping).includes(col.key))
  }, [columnMapping])

  if (!isReady) return <AdminLoadingSpinner />

  // --- Render Sections ---

  const renderUpload = () => (
    <div className="oa-flex oa-flex-col oa-gap-8 oa-max-w-[800px] oa-mx-auto oa-w-full">
      <Card>
        <div className="oa-p-4">
            <h2 className="oa-overline oa-mb-4">STEP 1: UPLOAD FILE</h2>
            <FileUpload
                accept=".csv,.xlsx,.xls"
                maxSize={5 * 1024 * 1024}
                helperText="Select a CSV or Excel file containing your athlete list (Max 5MB, 2,000 rows)."
                value={file}
                onFileSelect={handleFileUpload}
                buttonText="Select File"
                replaceText="Replace File"
                showDropZone={true}
                fullWidth={true}
                error={error}
            />
        </div>
      </Card>

      <Card>
        <div className="oa-p-4 oa-flex oa-flex-col oa-gap-4">
            <h2 className="oa-overline">DOWNLOAD TEMPLATE</h2>
            <p className="oa-body-m oa-text-muted">Use our provided template to ensure your athlete data is formatted correctly for a smooth import.</p>
            <div className="oa-flex oa-gap-3">
                <Button variant="secondary" onClick={() => window.open('/templates/athlete_import_template.csv')}>
                    CSV Template
                </Button>
                <Button variant="secondary" onClick={() => window.open('/templates/athlete_import_template.xlsx')}>
                    Excel Template
                </Button>
            </div>
        </div>
      </Card>
    </div>
  )

  const renderMapping = () => (
    <div className="oa-flex oa-flex-col oa-gap-8">
      <Card>
        <div className="oa-p-6 oa-border-b oa-border-slate-100">
            <h2 className="oa-overline oa-mb-1">STEP 2: COLUMN MAPPING</h2>
            <p className="oa-body-s oa-text-muted">Map your file's columns to the corresponding Youth Sports fields.</p>
        </div>
        <div className="oa-overflow-x-auto">
            <table className="oa-table">
                <thead>
                    <tr>
                        <th style={{ width: '30%' }}>SOURCE COLUMN</th>
                        <th style={{ width: '30%' }}>TARGET FIELD</th>
                        <th style={{ width: '30%' }}>SAMPLE DATA</th>
                        <th style={{ width: '10%' }} className="oa-text-right">STATUS</th>
                    </tr>
                </thead>
                <tbody>
                    {detectedHeaders.map((sourceCol) => {
                        const mappedTarget = columnMapping[sourceCol]
                        const isRequired = TEMPLATE_COLUMNS.required.some(col => col.key === mappedTarget)
                        const status = mappedTarget ? (isRequired ? 'Required' : 'Optional') : 'Pending'
                        
                        return (
                            <tr key={sourceCol}>
                                <td className="oa-font-bold oa-text-slate-900">{sourceCol}</td>
                                <td>
                                    <Select
                                        value={mappedTarget || ''}
                                        onChange={(e) => setColumnMapping(prev => ({ ...prev, [sourceCol]: e.target.value }))}
                                        options={[
                                            { value: '', label: 'Skip this column' },
                                            ...TEMPLATE_COLUMNS.required.map(col => ({ value: col.key, label: `${col.label} (Required)` })),
                                            ...TEMPLATE_COLUMNS.optional.map(col => ({ value: col.key, label: col.label }))
                                        ]}
                                    />
                                </td>
                                <td className="oa-text-sm oa-text-slate-400 oa-italic">{getSampleData(sourceCol)}</td>
                                <td className="oa-text-right">
                                    <Badge variant={mappedTarget ? (isRequired ? 'success' : 'neutral') : 'warning'}>
                                        {status}
                                    </Badge>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
        <div className="oa-p-6 oa-border-t oa-border-slate-100 oa-flex oa-justify-between oa-items-center">
            <Button variant="secondary" onClick={() => setStep('upload')}>Back to Upload</Button>
            <div className="oa-flex oa-items-center oa-gap-4">
                {!isMappingComplete && <span className="oa-text-sm oa-text-danger oa-font-medium">Map all required fields to continue</span>}
                <Button 
                    disabled={!isMappingComplete} 
                    onClick={() => { processRows(rawRows, columnMapping); setStep('validation'); }}
                >
                    Continue to Preview
                </Button>
            </div>
        </div>
      </Card>
    </div>
  )

  const renderValidation = () => (
    <div className="oa-flex oa-flex-col oa-gap-8">
      {/* Stats Bar */}
      <div className="oa-grid oa-grid-4 oa-gap-4">
        <Card>
            <div className="oa-p-5 oa-text-center">
                <p className="oa-overline oa-mb-1 oa-text-muted">TOTAL ROWS</p>
                <p className="oa-h2 oa-m-0">{stats.total}</p>
            </div>
        </Card>
        <Card style={{ borderLeft: '4px solid var(--oa-success)' }}>
            <div className="oa-p-5 oa-text-center">
                <p className="oa-overline oa-mb-1 oa-text-success">READY</p>
                <p className="oa-h2 oa-m-0">{stats.ready}</p>
            </div>
        </Card>
        <Card style={{ borderLeft: '4px solid var(--oa-warning)' }}>
            <div className="oa-p-5 oa-text-center">
                <p className="oa-overline oa-mb-1 oa-text-warning">WARNINGS</p>
                <p className="oa-h2 oa-m-0">{stats.warnings}</p>
            </div>
        </Card>
        <Card style={{ borderLeft: '4px solid var(--oa-danger)' }}>
            <div className="oa-p-5 oa-text-center">
                <p className="oa-overline oa-mb-1 oa-text-danger">ERRORS</p>
                <p className="oa-h2 oa-m-0">{stats.errors}</p>
            </div>
        </Card>
      </div>

      <div className="oa-flex oa-flex-col lg:oa-flex-row oa-gap-8">
        <div className="oa-flex-1">
            <Card>
                <div className="oa-p-4 oa-border-b oa-border-slate-100 oa-flex oa-justify-between oa-items-center">
                    <h2 className="oa-overline">DATA PREVIEW</h2>
                    <Button 
                        variant={showErrorsOnly ? 'danger' : 'secondary'} 
                        size="dense" 
                        onClick={() => setShowErrorsOnly(!showErrorsOnly)}
                    >
                        {showErrorsOnly ? 'Showing Errors Only' : 'Filter by Errors'}
                    </Button>
                </div>
                <div className="oa-overflow-x-auto">
                    <table className="oa-table oa-text-sm">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>STATUS</th>
                                <th>ATHLETE</th>
                                <th>EMAIL</th>
                                <th>DOB</th>
                                <th>MAPPINGS</th>
                                <th style={{ width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="oa-p-8 oa-text-center oa-text-muted">No rows match your current filters</td>
                                </tr>
                            ) : paginatedRows.map((row) => (
                                <tr key={row.row_number} className={cn({ 'oa-bg-danger-surface': row.status === 'error', 'oa-bg-warning-surface': row.status === 'warning' })}>
                                    <td className="oa-text-center">
                                        <span className={cn('material-symbols-outlined', { 
                                            'oa-text-success': row.status === 'ready',
                                            'oa-text-warning': row.status === 'warning',
                                            'oa-text-danger': row.status === 'error'
                                        })}>
                                            {row.status === 'ready' ? 'check_circle' : row.status === 'warning' ? 'warning' : 'error'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="oa-font-bold">{row.mapped_data.athlete_first_name} {row.mapped_data.athlete_last_name}</div>
                                        {(row.errors.length > 0) && <div className="oa-text-[10px] oa-text-danger oa-font-bold">{row.errors.join(' • ')}</div>}
                                    </td>
                                    <td>{row.mapped_data.athlete_email || '—'}</td>
                                    <td>{row.mapped_data.athlete_date_of_birth}</td>
                                    <td>
                                        <div className="oa-flex oa-flex-wrap oa-gap-1">
                                            {Object.entries(row.mapped_data).filter(([k,v]) => v && !['athlete_first_name', 'athlete_last_name', 'athlete_email', 'athlete_date_of_birth'].includes(k)).slice(0, 2).map(([k]) => (
                                                <Badge key={k} variant="neutral" className="oa-text-[9px] oa-font-black">{k.replace('athlete_', '').toUpperCase()}</Badge>
                                            ))}
                                            {Object.keys(row.mapped_data).length > 6 && <span className="oa-text-[10px] oa-text-muted">+more</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <Button variant="ghost" size="dense" icon="edit" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="oa-p-4 oa-border-t oa-border-slate-100 oa-flex oa-justify-between oa-items-center">
                    <span className="oa-text-xs oa-text-muted">Showing {paginatedRows.length} of {filteredRows.length} rows</span>
                    <div className="oa-flex oa-gap-1">
                        <Button 
                            variant="ghost" 
                            size="dense" 
                            icon="chevron_left" 
                            disabled={currentPage === 0} 
                            onClick={() => setCurrentPage(c => Math.max(0, c - 1))}
                        />
                        <Button 
                            variant="ghost" 
                            size="dense" 
                            icon="chevron_right" 
                            disabled={currentPage * rowsPerPage + rowsPerPage >= filteredRows.length} 
                            onClick={() => setCurrentPage(c => c + 1)}
                        />
                    </div>
                </div>
            </Card>
        </div>

        <div className="oa-w-full lg:oa-w-80 oa-flex oa-flex-col oa-gap-6">
            <Card>
                <div className="oa-p-4 oa-flex oa-flex-col oa-gap-4">
                    <h3 className="oa-overline">IMPORT SETTINGS</h3>
                    
                    <div className="oa-flex oa-flex-col oa-gap-3">
                        <label className="oa-flex oa-items-center oa-gap-2 oa-cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={importOptions.skipDuplicates} 
                                onChange={(e) => setImportOptions(prev => ({ ...prev, skipDuplicates: e.target.checked }))}
                            />
                            <span className="oa-text-sm oa-font-bold">Skip Duplicates</span>
                        </label>
                        <label className="oa-flex oa-items-center oa-gap-2 oa-cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={importOptions.autoAssignTeams} 
                                onChange={(e) => setImportOptions(prev => ({ ...prev, autoAssignTeams: e.target.checked }))}
                            />
                            <span className="oa-text-sm oa-font-bold">Auto-assign Teams</span>
                        </label>
                    </div>

                    <Select
                        label="Default Team"
                        value={importOptions.destinationTeam}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, destinationTeam: e.target.value }))}
                        options={[
                            { value: '', label: 'No Default Team' },
                            // Teams would be loaded here in a real implementation
                        ]}
                    />

                    <Select
                        label="Import Mode"
                        value={importOptions.importMode}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, importMode: e.target.value as any }))}
                        options={[
                            { value: 'create_only', label: 'Create Only' },
                            { value: 'update_and_create', label: 'Update + Create' },
                            { value: 'update_only', label: 'Update Only' }
                        ]}
                    />
                </div>
            </Card>

            <div className="oa-flex oa-flex-col oa-gap-3">
                <Button 
                    className="oa-w-full" 
                    icon="cloud_upload"
                    loading={loading}
                    disabled={loading || stats.errors > 0}
                    onClick={executeImport}
                >
                    Complete Import
                </Button>
                <Button 
                    variant="secondary" 
                    className="oa-w-full" 
                    onClick={() => setStep('mapping')}
                    disabled={loading}
                >
                    Edit Mappings
                </Button>
                {stats.errors > 0 && <p className="oa-text-[10px] oa-text-danger oa-text-center oa-font-bold">Fix errors in data preview to continue import</p>}
            </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="oa-root oa-bg-neutral-light oa-min-h-screen">
      <AdminPageHeader
        title="Import Athletes"
        subtitle="Bring your roster into Youth Sports from CSV or Excel."
        breadcrumbs={[
          { label: 'Athletes', path: getLink('admin.athletes.list') },
          { label: 'Import Athletes' },
        ]}
      />

      <div className="oa-content">
        {step === 'upload' && renderUpload()}
        {step === 'mapping' && renderMapping()}
        {step === 'validation' && renderValidation()}
      </div>

      {loading && (
        <div className="oa-fixed oa-inset-0 oa-bg-white/80 oa-flex oa-items-center oa-justify-center oa-z-50">
            <AdminLoadingSpinner />
        </div>
      )}
    </div>
  )
}

