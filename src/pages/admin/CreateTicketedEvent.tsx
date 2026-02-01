/**
 * Admin Create Ticketed Event Page
 * 
 * Form to create a new ticketed event
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FileUpload } from '@/components/common/FileUpload'
import { useRouteLink } from '@/utils/routes'
import type { TicketedEventType, TicketedEventStatus } from '@/types/ticketing'
import { uploadTicketBanner } from '@/data/services/organizationService'

export default function CreateTicketedEvent() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'other' as TicketedEventType,
    starts_at: '',
    ends_at: '',
    timezone: 'America/New_York',
    venue_name: '',
    venue_city: '',
    venue_state: '',
    sales_start_at: '',
    sales_end_at: '',
    status: 'draft' as TicketedEventStatus,
    event_description: '',
    ticket_banner_url: '',
  })
  const [bannerFile, setBannerFile] = useState<File | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      // Get user's org_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!userData?.org_id) throw new Error('No organization')

      // Use a temporary ID for file path if needed, or upload after? 
      // Upload path is ticket-banners/{orgId}/{eventId}/{fileName}. We don't have eventId yet.
      // Strategy: Insert event first to get ID, then upload banner and update event.
      
      const { data, error } = await supabase
        .from('ticketed_events')
        .insert({
          org_id: userData.org_id,
          ...formData,
          starts_at: formData.starts_at || null,
          ends_at: formData.ends_at || null,
          sales_start_at: formData.sales_start_at || null,
          sales_end_at: formData.sales_end_at || null,
        } as any)
        .select('id')
        .single()

      if (error) throw error

      if (bannerFile) {
         const { path, error: uploadError } = await uploadTicketBanner(userData.org_id, data.id, bannerFile)
         if (!uploadError && path) {
             await supabase.from('ticketed_events').update({ ticket_banner_url: path }).eq('id', data.id)
         }
      }

      return data
    },
    onSuccess: (data) => {
      navigate(useRouteLink('admin.ticketingEvents.detail', { id: data.id }))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="pa-page-container">
      <div className="pa-page-header">
        <h1 className="pa-page-title">Create Ticketed Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="pa-form">
        <div className="pa-form-group">
          <label className="pa-form-label">Event Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="pa-form-input"
            required
          />
        </div>

        <div className="pa-form-group">
          <label className="pa-form-label">Internal Methods / Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="pa-form-input"
            rows={2}
          />
        </div>

        <div className="pa-form-group">
          <label className="pa-form-label">Public Event Description</label>
           <textarea
            value={formData.event_description}
            onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
            className="pa-form-input"
            rows={4}
            maxLength={500}
            placeholder="Description shown to public users..."
          />
        </div>

        <div className="pa-form-group">
          <FileUpload
            label="Ticket Banner Image"
            onFileSelect={setBannerFile}
            value={bannerFile}
            accept="image/*"
            maxSize={5 * 1024 * 1024}
            buttonText="Upload Banner"
            helperText="Suggested size: 1200 × 400 px. Max 5MB."
            showDropZone={true}
            fullWidth={true}
          />
        </div>

        <div className="pa-form-row">
          <div className="pa-form-group">
            <label className="pa-form-label">Start Date/Time *</label>
            <input
              type="datetime-local"
              value={formData.starts_at}
              onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
              className="pa-form-input"
              required
            />
          </div>

          <div className="pa-form-group">
            <label className="pa-form-label">End Date/Time *</label>
            <input
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
              className="pa-form-input"
              required
            />
          </div>
        </div>

        <div className="pa-form-row">
          <div className="pa-form-group">
            <label className="pa-form-label">Venue Name</label>
            <input
              type="text"
              value={formData.venue_name}
              onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
              className="pa-form-input"
            />
          </div>

          <div className="pa-form-group">
            <label className="pa-form-label">City</label>
            <input
              type="text"
              value={formData.venue_city}
              onChange={(e) => setFormData({ ...formData, venue_city: e.target.value })}
              className="pa-form-input"
            />
          </div>

          <div className="pa-form-group">
            <label className="pa-form-label">State</label>
            <input
              type="text"
              value={formData.venue_state}
              onChange={(e) => setFormData({ ...formData, venue_state: e.target.value })}
              className="pa-form-input"
            />
          </div>
        </div>

        <div className="pa-form-group">
          <label className="pa-form-label">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as TicketedEventStatus })}
            className="pa-form-input"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="pa-form-actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="pa-button pa-button-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="pa-button pa-button-primary"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  )
}
