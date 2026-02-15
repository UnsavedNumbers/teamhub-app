/**
 * Admin Create Ticketed Event Page
 * 
 * Form to create a new ticketed event
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { AdminPageHeader, Card, Button, Input } from '@/components/admin'
import { FileUpload } from '@/components/common/FileUpload'
import { getLink, useRouteLink } from '@/utils/routes'
import type { TicketedEventType, TicketedEventStatus } from '@/types/ticketing'
import { uploadTicketBanner } from '@/data/services/organizationService'
import '../../styles/orgAdmin.css'

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export default function CreateTicketedEvent() {
  useDebugLifecycle('CreateTicketedEvent')
  
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'other' as TicketedEventType,
    sport_id: '',
    program_id: '',
    season_id: '',
    team_id: '',
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
        .select('id,event_id')
        .single()

      if (error) throw error

      if (bannerFile) {
         const { path, error: uploadError } = await uploadTicketBanner(userData.org_id, data.id, bannerFile)
         if (!uploadError && path) {
             await supabase.from('ticketed_events').update({ cover_image_path: path }).eq('id', data.id)
         }
      }

      return data
    },
    onSuccess: (data) => {
      if (data.event_id) {
        navigate(`${getLink('admin.events.detail', { id: data.event_id })}?view=ticketing`)
      } else {
        navigate(useRouteLink('admin.ticketingEvents.list'))
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="oa-theme-active pa-layout">
      <AdminPageHeader
        title="Create Ticketed Event"
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Ticketing', path: '/admin/ticketing/events' },
          { label: 'Create Event' }
        ]}
      />

      <div className="oa-form-container">
        <form onSubmit={handleSubmit}>
          <Card title="Event Details" className="oa-mb-6">
            <div className="oa-flex oa-flex-col oa-gap-4">
              <Input
                label="Event Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Enter event name"
              />

              <Input
                label="Internal Notes / Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Internal notes (not shown to public)"
              />

              <Input
                label="Public Event Description"
                value={formData.event_description}
                onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
                placeholder="Description shown to public users..."
                maxLength={500}
              />

              <div className="oa-form-group">
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
            </div>
          </Card>

          <Card title="Event Schedule" className="oa-mb-6">
            <div className="oa-flex oa-flex-col oa-gap-4">
              <div className="oa-grid oa-grid-2 oa-gap-4">
                <div className="oa-form-group">
                  <label className="oa-label oa-label--required">Start Date/Time</label>
                  <input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    className="oa-form-input"
                    required
                  />
                </div>

                <div className="oa-form-group">
                  <label className="oa-label oa-label--required">End Date/Time</label>
                  <input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    className="oa-form-input"
                    required
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card title="Venue Information" className="oa-mb-6">
            <div className="oa-flex oa-flex-col oa-gap-4">
              <Input
                label="Venue Name"
                value={formData.venue_name}
                onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                placeholder="Enter venue name"
              />

              <div className="oa-grid oa-grid-2 oa-gap-4">
                <Input
                  label="City"
                  value={formData.venue_city}
                  onChange={(e) => setFormData({ ...formData, venue_city: e.target.value })}
                  placeholder="Enter city"
                />

                <Input
                  label="State"
                  value={formData.venue_state}
                  onChange={(e) => setFormData({ ...formData, venue_state: e.target.value })}
                  placeholder="Enter state"
                />
              </div>
            </div>
          </Card>

          <Card title="Event Status" className="oa-mb-6">
            <div className="oa-form-group">
              <label className="oa-label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TicketedEventStatus })}
                className="oa-form-input"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </Card>

          <div className="oa-form-actions">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending}
            >
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
