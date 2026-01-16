import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

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
    <>
      <PortalHeader />
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Teams' },
        ]}
      >
        <div className="mb-12 flex items-end justify-between">
          <div>
            <PageTitle>Teams</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
              Manage your children's team memberships.
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Add
          </Button>
        </div>

        {!profile?.family_id ? (
          <Card className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">Account not linked to a family. Contact your administrator.</p>
          </Card>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : children.length === 0 ? (
          <Card className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
              <Icon name="group" size="text-4xl" className="text-slate-400" />
            </div>
            <CardTitle className="mb-2">No children added</CardTitle>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Add children to register them for teams.</p>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Add
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Card key={child.id} className="p-6 hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#137fec]/20 rounded-full flex items-center justify-center">
                    <span className="text-lg font-black text-[#137fec]">{child.first_name[0]}</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg mb-1">{child.first_name} {child.last_name}</CardTitle>
                    {child.birthdate && (
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        Age {calculateAge(child.birthdate)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add Child Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <Card className="max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <CardTitle className="mb-6">Add</CardTitle>
              
              {error && (
                <Card className="mb-4 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-3">
                  <p className="text-red-600 dark:text-red-400 text-sm font-bold">{error}</p>
                </Card>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">First Name</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="First name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Birthdate</label>
                  <input
                    type="date"
                    value={form.birthdate}
                    onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || !form.first_name.trim() || !form.last_name.trim()}
                >
                  {saving ? 'Saving' : 'Save'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </PortalLayout>
    </>
  )
}
