
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PortalLayout from '../../components/portal/PortalLayout'
import { PageTitle } from '../../components/portal/Typography'
import EventForm from '../../components/calendar/EventForm'
import { createEvent } from '../../data/services/eventsService'
import { useUserContext } from '../../hooks/useUserContext'
import { EventFormData } from '../../types/calendar'

export default function PortalCreateEvent() {
  const navigate = useNavigate()
  const { context } = useUserContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: EventFormData) => {
    setLoading(true)
    setError(null)
    const { error } = await createEvent(context, data)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/portal/calendar')
    }
  }

  return (
    <PortalLayout breadcrumbs={[{ label: 'Calendar', path: '/portal/calendar' }, { label: 'New Event' }]}>
      <div className="mb-6">
        <PageTitle>Create Event</PageTitle>
      </div>
      <div className="max-w-3xl mx-auto">
        <EventForm 
            mode="create" 
            onSubmit={handleSubmit} 
            loading={loading}
            error={error}
        />
      </div>
    </PortalLayout>
  )
}
