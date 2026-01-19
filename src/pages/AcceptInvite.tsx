import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import PortalLayout from '../components/portal/PortalLayout'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  // Context available if needed
  // const { isReady } = useUserContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!code) {
      setMessage('Invalid invite code.')
    }
  }, [code])

  const handleJoin = async () => {
    setLoading(true)
    // Simulating join
    await new Promise(r => setTimeout(r, 1000))
    setMessage('Successfully joined!')
    setTimeout(() => navigate('/portal/dashboard'), 1500)
    setLoading(false)
  }

  return (
    <>
      <PortalLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Card className="max-w-md w-full p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Accept Invitation</h2>
            {message ? (
              <p className="mb-4">{message}</p>
            ) : (
              <>
                <p className="mb-6">You have been invited to join with code: <strong>{code}</strong></p>
                <Button variant="primary" onClick={handleJoin} disabled={loading} className="w-full">
                  {loading ? 'Joining...' : 'Join Now'}
                </Button>
              </>
            )}
          </Card>
        </div>
      </PortalLayout>
    </>
  )
}
