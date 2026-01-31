/**
 * Billing Section
 *
 * Read-only view of organization billing information with link to billing page.
 */

import { useOrganization } from '../../../contexts/OrganizationContext'
import { Button, Card } from '../../../components/platformAdmin'
import { useNavigate } from 'react-router-dom'

export default function BillingSection() {
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Billing & Subscription</h3>
        <p className="text-sm text-gray-500">
          View and manage your organization's subscription and billing settings
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Plan
            </label>
            <p className="text-base text-gray-900">Free</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization ID
            </label>
            <p className="text-sm text-gray-600 font-mono">
              {currentOrganization?.id || 'N/A'}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Billing settings including payment methods, invoices, and subscription management
              are managed on the dedicated billing page.
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => navigate('/admin/organization/billing')}
              variant="primary"
            >
              Manage Billing & Subscription
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

