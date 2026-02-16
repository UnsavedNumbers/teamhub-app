/**
 * Complete Profile Page
 *
 * Optional profile completion step shown after first team join.
 * Allows users to add additional information to their profile.
 */

import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import { showSuccess } from '../utils/toast'

export default function CompleteProfile() {
  const { context, isReady } = useUserContext()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [homeZipcode, setHomeZipcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load current user data
  useEffect(() => {
    if (!isReady || !user) return

    const loadUserData = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, phone, home_zipcode')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
        setPhone(data.phone || '')
        setHomeZipcode(data.home_zipcode || '')
      }
    }

    loadUserData()
  }, [isReady, user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isReady || !user || !context) {
      setError('User context not available')
      return
    }

    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const trimmedPhone = phone.trim()
    const trimmedZipcode = homeZipcode.trim()

    if (!trimmedFirstName || !trimmedLastName) {
      setError('First name and last name are required')
      return
    }

    setLoading(true)

    try {
      const updateData: any = {
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        phone: trimmedPhone || null,
        home_zipcode: trimmedZipcode || null,
        profile_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Update display_name
      if (trimmedFirstName && trimmedLastName) {
        updateData.display_name = `${trimmedFirstName} ${trimmedLastName}`.trim()
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      showSuccess('Profile completed successfully!')
      navigate('/portal/dashboard')
    } catch (err) {
      console.error('Failed to complete profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to save profile')
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Mark that user was prompted but skipped
    navigate('/portal/dashboard')
  }

  if (!isReady || !user) {
    return (
      <PortalLayout>
        <div className="max-w-md mx-auto">
          <Card className="p-8 text-center">
            <p>Loading...</p>
          </Card>
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout>
      <div className="max-w-md mx-auto">
        <div className="mb-12 text-center">
          <PageTitle>Complete Your Profile</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
            Add some information to help us personalize your experience (optional)
          </p>
        </div>

        <Card className="p-8">
          {error && (
            <div className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4 rounded">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
                placeholder="John"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
                placeholder="Smith"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">
                Phone Number <span className="text-slate-400 text-xs">(Optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Home Zipcode */}
            <div>
              <label htmlFor="homeZipcode" className="block text-sm font-medium mb-2">
                Home Zip Code <span className="text-slate-400 text-xs">(Optional)</span>
              </label>
              <input
                id="homeZipcode"
                type="text"
                maxLength={10}
                value={homeZipcode}
                onChange={(e) => setHomeZipcode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
                placeholder="12345"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading}
              >
                Complete Profile
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSkip}
                disabled={loading}
                className="flex-1"
              >
                Skip for Now
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PortalLayout>
  )
}
