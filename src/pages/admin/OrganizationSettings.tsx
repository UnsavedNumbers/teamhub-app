import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

interface OrganizationFormData {
  name: string
  slug: string
  contact_email: string
  refund_policy: string
}

export default function OrganizationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    defaultValues: {
      name: '',
      slug: '',
      contact_email: '',
      refund_policy: '',
    },
  })

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchOrganization()
    }
  }, [currentOrganization])

  async function fetchOrganization() {
    if (!currentOrganization?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, slug, contact_email, refund_policy')
        .eq('id', currentOrganization.id)
        .single()

      if (error) throw error

      if (data) {
        reset({
          name: data.name || '',
          slug: data.slug || '',
          contact_email: data.contact_email || '',
          refund_policy: data.refund_policy || '',
        })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load organization')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: OrganizationFormData) => {
    if (!currentOrganization?.id) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: data.name,
          slug: data.slug,
          contact_email: data.contact_email,
          refund_policy: data.refund_policy,
        })
        .eq('id', currentOrganization.id)

      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <AdminSkeletonTable rows={6} columns={2} />
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        Organization Settings
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Organization settings updated successfully!
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Organization name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Organization Name"
                      fullWidth
                      required
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="slug"
                  control={control}
                  rules={{
                    required: 'Slug is required',
                    pattern: {
                      value: /^[a-z0-9-]+$/,
                      message: 'Slug must contain only lowercase letters, numbers, and hyphens',
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Slug"
                      fullWidth
                      required
                      error={!!errors.slug}
                      helperText={errors.slug?.message || 'Used in URLs (e.g., your-org-name)'}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="contact_email"
                  control={control}
                  rules={{
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Contact Email"
                      type="email"
                      fullWidth
                      error={!!errors.contact_email}
                      helperText={errors.contact_email?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="refund_policy"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Refund Policy"
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="Enter your organization's refund policy..."
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
