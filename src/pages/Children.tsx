import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Child {
  id: string
  first_name: string
  last_name: string
  birthdate: string | null
}

export default function Children() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', birthdate: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { profile } = useAuth()

  const fetchChildren = useCallback(async () => {
    if (!profile?.family_id) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('first_name')

    if (!error) setChildren((data as Child[]) || [])
    setLoading(false)
  }, [profile?.family_id])

  useEffect(() => {
    if (profile?.family_id) fetchChildren()
    else setLoading(false)
  }, [profile, fetchChildren])

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim() || !profile?.family_id) return
    
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('children').insert({
      family_id: profile.family_id,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      birthdate: form.birthdate || null,
    } as never)

    if (error) {
      setError(error.message)
    } else {
      setForm({ first_name: '', last_name: '', birthdate: '' })
      setShowModal(false)
      fetchChildren()
    }
    setSaving(false)
  }

  function calculateAge(birthdate: string | null) {
    if (!birthdate) return null
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/portal/dashboard" className="text-slate-400 hover:text-white transition-colors">← Dashboard</Link>
              <h1 className="text-xl font-bold text-white">My Children</h1>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Child</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!profile?.family_id ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">Your account is not linked to a family yet. Contact your administrator.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : children.length === 0 ? (
          <div className="card text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700/50 rounded-full mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No children added</h3>
            <p className="text-slate-400 mb-6">Add your children to register them for teams.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">Add Child</button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <div key={child.id} className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-600/20 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-400">{child.first_name[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{child.first_name} {child.last_name}</h3>
                    {child.birthdate && (
                      <p className="text-sm text-slate-400">Age: {calculateAge(child.birthdate)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Child Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Add Child</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="input-field"
                  placeholder="First name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="input-field"
                  placeholder="Last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Birthdate (optional)</label>
                <input
                  type="date"
                  value={form.birthdate}
                  onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button 
                onClick={handleSave} 
                disabled={saving || !form.first_name.trim() || !form.last_name.trim()} 
                className="btn-primary"
              >
                {saving ? 'Saving...' : 'Add Child'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
