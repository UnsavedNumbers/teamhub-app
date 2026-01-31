import { useState } from 'react'
import { PageHeader, Card, Button, Input, Select, Badge } from '../../components/platformAdmin'

/**
 * Forms Example - Nike + Google Design System
 * 
 * Demonstrates all form components:
 * - Input with icons, labels, helpers, errors
 * - Select dropdowns
 * - Checkboxes and toggles
 * - Form validation
 */
export default function FormsExample() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    status: 'active',
    notifications: false,
    newsletter: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple validation
    const newErrors: Record<string, string> = {}
    if (!formData.name) newErrors.name = 'Name is required'
    if (!formData.email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      // Form submitted successfully - in a real app, this would show a toast or success message
      console.log('Form submitted successfully!', formData)
    }
  }

  return (
    <div>
      <PageHeader
        title="FORMS"
        subtitle="Nike + Google design system form components"
      />

      <div className="pa-grid pa-grid-2">
        {/* Form Example */}
        <Card title="User Form">
          <form onSubmit={handleSubmit}>
            <Input
              label="Full Name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
              icon="person"
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              helper="We'll never share your email with anyone else."
              required
              icon="mail"
            />

            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={[
                { value: 'admin', label: 'Administrator' },
                { value: 'user', label: 'User' },
                { value: 'viewer', label: 'Viewer' },
              ]}
              required
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
              ]}
            />

            <div className="pa-form-group">
              <label className="pa-checkbox">
                <input
                  type="checkbox"
                  className="pa-checkbox-input"
                  checked={formData.notifications}
                  onChange={(e) =>
                    setFormData({ ...formData, notifications: e.target.checked })
                  }
                />
                <span className="pa-body-m">Enable email notifications</span>
              </label>
            </div>

            <div className="pa-form-group">
              <label className="pa-checkbox">
                <input
                  type="checkbox"
                  className="pa-checkbox-input"
                  checked={formData.newsletter}
                  onChange={(e) =>
                    setFormData({ ...formData, newsletter: e.target.checked })
                  }
                />
                <span className="pa-body-m">Subscribe to newsletter</span>
              </label>
            </div>

            <div className="pa-flex pa-gap-3 pa-mt-4">
              <Button type="submit" variant="primary">
                <span className="material-symbols-outlined">save</span>
                Save Changes
              </Button>
              <Button
                type="button"
                variant="blue"
                onClick={() => {
                  setFormData({
                    name: '',
                    email: '',
                    role: 'user',
                    status: 'active',
                    notifications: false,
                    newsletter: true,
                  })
                  setErrors({})
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </Card>

        {/* Input Variants */}
        <Card title="Input Variants">
          <Input
            label="Default Input"
            placeholder="Type something..."
          />

          <Input
            label="With Left Icon"
            placeholder="Search..."
            icon="search"
          />

          <Input
            label="With Right Icon"
            placeholder="Enter password"
            type="password"
            iconRight="visibility"
          />

          <Input
            label="With Helper Text"
            placeholder="Username"
            helper="Choose a unique username"
            icon="person"
          />

          <Input
            label="Error State"
            placeholder="Invalid input"
            error="This field is required"
            icon="error"
          />

          <Input
            label="Disabled Input"
            placeholder="Cannot edit"
            disabled
            value="Read-only value"
          />

          <div className="pa-form-group">
            <label className="pa-label">Textarea</label>
            <textarea
              className="pa-input pa-textarea"
              placeholder="Enter a description..."
              rows={4}
            />
          </div>
        </Card>
      </div>

      {/* Toggle Switches */}
      <Card title="Toggle Switches" className="pa-mt-5">
        <div className="pa-grid pa-grid-3">
          <div>
            <div className="pa-flex pa-items-center pa-gap-3">
              <label className="pa-toggle">
                <input type="checkbox" className="pa-toggle-input" defaultChecked />
                <div className="pa-toggle-track" />
                <div className="pa-toggle-thumb" />
              </label>
              <span className="pa-body-m">Enabled</span>
            </div>
          </div>

          <div>
            <div className="pa-flex pa-items-center pa-gap-3">
              <label className="pa-toggle">
                <input type="checkbox" className="pa-toggle-input" />
                <div className="pa-toggle-track" />
                <div className="pa-toggle-thumb" />
              </label>
              <span className="pa-body-m">Disabled</span>
            </div>
          </div>

          <div>
            <div className="pa-flex pa-items-center pa-gap-3">
              <label className="pa-toggle">
                <input type="checkbox" className="pa-toggle-input" defaultChecked disabled />
                <div className="pa-toggle-track" />
                <div className="pa-toggle-thumb" />
              </label>
              <span className="pa-body-m pa-text-muted">Disabled (On)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Form State Preview */}
      <Card title="Form State (Debug)" className="pa-mt-5">
        <div className="pa-flex pa-flex-col pa-gap-2">
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="pa-body-s pa-text-muted" style={{ width: '120px' }}>Name:</span>
            <span className="pa-body-m">{formData.name || '—'}</span>
          </div>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="pa-body-s pa-text-muted" style={{ width: '120px' }}>Email:</span>
            <span className="pa-body-m">{formData.email || '—'}</span>
          </div>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="pa-body-s pa-text-muted" style={{ width: '120px' }}>Role:</span>
            <Badge variant="info">{formData.role}</Badge>
          </div>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="pa-body-s pa-text-muted" style={{ width: '120px' }}>Status:</span>
            <Badge variant={formData.status === 'active' ? 'success' : 'warning'}>
              {formData.status}
            </Badge>
          </div>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="pa-body-s pa-text-muted" style={{ width: '120px' }}>Notifications:</span>
            <span className="pa-body-m">{formData.notifications ? '✓ Yes' : '✗ No'}</span>
          </div>
          <div className="pa-flex pa-items-center pa-gap-2">
            <span className="pa-body-s pa-text-muted" style={{ width: '120px' }}>Newsletter:</span>
            <span className="pa-body-m">{formData.newsletter ? '✓ Yes' : '✗ No'}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
