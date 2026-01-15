import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'

type TryoutRow = {
  id: string
  org_id: string
  title: string
  name: string | null
  type: string
  location: string
  start_at: string | null
  end_at: string | null
  tryout_date: string | null
  start_time: string | null
  end_time: string | null
  notes: string | null
  capacity: number | null
  max_spots: number | null
}

type ChildRow = { id: string; first_name: string; last_name: string }

type RegistrationRow = {
  id: string
  tryout_id: string
  child_id: string
  status: string
  created_at: string
}

type RequiredDocRow = {
  id: string
  tryout_id: string
  key: string
  label: string
  description: string | null
  required: boolean
}

type RegistrationDocRow = {
  id: string
  registration_id: string
  required_document_id: string
  status: string
  storage_bucket: string
  storage_path: string | null
  file_name: string | null
  content_type: string | null
  file_size_bytes: number | null
  uploaded_at: string | null
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function legacyStartAt(t: TryoutRow): string | null {
  if (t.start_at) return t.start_at
  if (t.tryout_date && t.start_time) {
    return `${t.tryout_date}T${t.start_time}`
  }
  return null
}

export default function TryoutDetail() {
  const { tryoutId } = useParams()
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()

  const [tryout, setTryout] = useState<TryoutRow | null>(null)
  const [children, setChildren] = useState<ChildRow[]>([])
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocRow[]>([])
  const [regDocs, setRegDocs] = useState<RegistrationDocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState('')
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)

  const myRegistrationByChild = useMemo(() => {
    const map = new Map<string, RegistrationRow>()
    registrations.forEach((r) => map.set(r.child_id, r))
    return map
  }, [registrations])

  const selectedRegistration = useMemo(() => {
    if (!selectedChildId) return null
    return myRegistrationByChild.get(selectedChildId) ?? null
  }, [myRegistrationByChild, selectedChildId])

  const docsByRequiredId = useMemo(() => {
    const map = new Map<string, RegistrationDocRow>()
    regDocs.forEach((d) => map.set(d.required_document_id, d))
    return map
  }, [regDocs])

  const fetchAll = useCallback(async () => {
    if (!tryoutId || !profile || !currentOrganization) return
    setLoading(true)

    const { data: tryoutData, error: tryoutError } = await supabase
      .from('tryouts')
      .select('*')
      .eq('id', tryoutId)
      .eq('org_id', currentOrganization.id)
      .single()

    if (tryoutError) {
      console.error(tryoutError)
      setTryout(null)
      setLoading(false)
      return
    }

    setTryout(tryoutData as unknown as TryoutRow)

    // children (parent only)
    if (profile.family_id) {
      const { data: childData } = await supabase
        .from('children')
        .select('id, first_name, last_name')
        .eq('family_id', profile.family_id)

      setChildren((childData as ChildRow[]) || [])

      const { data: regData } = await supabase
        .from('tryout_registrations')
        .select('id, tryout_id, child_id, status, created_at')
        .eq('tryout_id', tryoutId)
        .eq('family_id', profile.family_id)

      const regs = (regData as unknown as RegistrationRow[]) || []
      setRegistrations(regs)

      // Required docs + docs for the first registration (or selected child)
      const { data: reqDocData } = await (supabase as any)
        .from('tryout_required_documents')
        .select('id, tryout_id, key, label, description, required')
        .eq('tryout_id', tryoutId)
        .order('created_at', { ascending: true })

      setRequiredDocs((reqDocData as RequiredDocRow[]) || [])

      const registrationId = (selectedRegistration?.id ?? regs[0]?.id) || null
      if (registrationId) {
        const { data: regDocData } = await (supabase as any)
          .from('tryout_registration_documents')
          .select(
            'id, registration_id, required_document_id, status, storage_bucket, storage_path, file_name, content_type, file_size_bytes, uploaded_at'
          )
          .eq('registration_id', registrationId)

        setRegDocs((regDocData as RegistrationDocRow[]) || [])
      } else {
        setRegDocs([])
      }
    }

    setLoading(false)
  }, [tryoutId, profile, currentOrganization, selectedRegistration?.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  async function handleRegister() {
    if (!tryoutId || !selectedChildId) return
    setRegistering(true)
    try {
      const { data, error } = await supabase.rpc('register_child_for_tryout', {
        p_tryout_id: tryoutId,
        p_child_id: selectedChildId,
      })
      if (error) throw error
      const registrationId = data as string

      // Load docs for the new/updated registration
      const { data: regDocData } = await (supabase as any)
        .from('tryout_registration_documents')
        .select(
          'id, registration_id, required_document_id, status, storage_bucket, storage_path, file_name, content_type, file_size_bytes, uploaded_at'
        )
        .eq('registration_id', registrationId)

      setRegDocs((regDocData as RegistrationDocRow[]) || [])
      await fetchAll()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  async function handleUpload(requiredDoc: RequiredDocRow, file: File) {
    if (!tryout || !selectedRegistration || !currentOrganization) return

    const docRow = docsByRequiredId.get(requiredDoc.id)
    if (!docRow) {
      alert('Missing document row. Please refresh and try again.')
      return
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `org/${currentOrganization.id}/tryouts/${tryout.id}/registrations/${selectedRegistration.id}/${requiredDoc.key}/${safeName}`

    setUploadingDocId(requiredDoc.id)
    try {
      // DB-first: set expected storage_path so Storage RLS can authorize the upload
      const { error: preError } = await (supabase as any)
        .from('tryout_registration_documents')
        .update({
          storage_path: storagePath,
          file_name: file.name,
          content_type: file.type,
          file_size_bytes: file.size,
        })
        .eq('id', docRow.id)

      if (preError) throw preError

      const { error: uploadError } = await supabase.storage
        .from('tryout-documents')
        .upload(storagePath, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { error: postError } = await (supabase as any)
        .from('tryout_registration_documents')
        .update({
          status: 'uploaded',
          uploaded_at: new Date().toISOString(),
          uploaded_by_user_id: profile?.id,
        })
        .eq('id', docRow.id)

      if (postError) throw postError

      await fetchAll()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingDocId(null)
    }
  }

  async function handleDownload(doc: RegistrationDocRow) {
    if (!doc.storage_path) return
    const { data, error } = await supabase.storage
      .from(doc.storage_bucket)
      .createSignedUrl(doc.storage_path, 60)
    if (error) {
      alert(error.message)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const start = tryout ? legacyStartAt(tryout) : null
  const cap = tryout ? (tryout.capacity ?? tryout.max_spots) : null

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="animate-pulse h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
          <div className="animate-pulse h-24 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    )
  }

  if (!tryout) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link to="/portal/tryouts" className="text-slate-500 hover:text-slate-700 dark:hover:text-white">
            ← Back to Tryouts
          </Link>
          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Tryout not found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800/50 border-b border-neutral-200 dark:border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/portal/tryouts" className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors mr-4">
              ← Tryouts
            </Link>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {tryout.name ?? tryout.title}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-slate-800 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-slate-300 font-bold">When</p>
              <p className="text-white">{start ? formatDateTime(start) : 'TBD'}</p>
              <p className="text-slate-400 text-sm">{tryout.location}</p>
              {tryout.notes && <p className="text-slate-300 mt-3 whitespace-pre-wrap">{tryout.notes}</p>}
            </div>
            <div className="text-sm text-slate-300">
              <p>
                <span className="text-slate-400">Type:</span> {tryout.type}
              </p>
              {cap !== null && (
                <p>
                  <span className="text-slate-400">Capacity:</span> {cap}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-5">
          <h2 className="text-white font-black uppercase tracking-tight mb-4">Registration</h2>

          {!profile?.family_id ? (
            <p className="text-slate-300">Only parent accounts can register a child for tryouts.</p>
          ) : (
            <>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Select athlete
              </label>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="input-field mb-4"
              >
                <option value="">Choose athlete...</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>

              {selectedChildId && !selectedRegistration ? (
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="px-6 py-2 bg-white text-slate-900 font-bold uppercase text-sm rounded-lg hover:bg-slate-100 disabled:opacity-60"
                >
                  {registering ? 'Registering...' : 'Register'}
                </button>
              ) : selectedRegistration ? (
                <div className="text-slate-300">
                  <p>
                    Status:{' '}
                    <span className="text-white font-bold">
                      {selectedRegistration.status.replace('_', ' ')}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Select an athlete to register or view status.</p>
              )}
            </>
          )}
        </div>

        {selectedRegistration && (
          <div className="bg-slate-800 rounded-xl p-5">
            <h2 className="text-white font-black uppercase tracking-tight mb-4">Required Documents</h2>
            {requiredDocs.length === 0 ? (
              <p className="text-slate-300">No documents required.</p>
            ) : (
              <div className="space-y-4">
                {requiredDocs.map((rd) => {
                  const d = docsByRequiredId.get(rd.id)
                  const status = d?.status ?? 'missing'
                  const uploading = uploadingDocId === rd.id
                  return (
                    <div key={rd.id} className="border border-slate-700/50 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white font-bold">
                            {rd.label}{' '}
                            {rd.required && <span className="text-xs text-red-300">(required)</span>}
                          </p>
                          {rd.description && <p className="text-slate-400 text-sm">{rd.description}</p>}
                          <p className="text-xs text-slate-500 mt-1">Status: {status}</p>
                          {d?.file_name && (
                            <p className="text-xs text-slate-400 mt-1">
                              File: {d.file_name} {d.uploaded_at ? `• uploaded ${formatDateTime(d.uploaded_at)}` : ''}
                            </p>
                          )}
                        </div>
                        {d?.storage_path && status === 'uploaded' && (
                          <button
                            onClick={() => handleDownload(d)}
                            className="px-3 py-2 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-700 text-sm"
                          >
                            Download
                          </button>
                        )}
                      </div>

                      <div className="mt-3">
                        <input
                          type="file"
                          disabled={uploading || !d}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) void handleUpload(rd, file)
                            e.currentTarget.value = ''
                          }}
                          className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-white file:text-slate-900 hover:file:bg-slate-100 disabled:opacity-60"
                        />
                        {uploading && <p className="text-xs text-slate-400 mt-2">Uploading...</p>}
                        {!d && (
                          <p className="text-xs text-amber-300 mt-2">
                            Document row not created yet. Try refreshing or re-registering.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

