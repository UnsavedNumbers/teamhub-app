import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Alert,
  CircularProgress,
} from '@mui/material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getErrorMessage } from '../../utils/errorUtils'

interface UserFormData {
  email: string
  role: 'coach' | 'org_admin'
}

export default function CreateUser() {
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<UserFormData>({
    defaultValues: {
      email: '',
      role: 'coach',
    },
  })

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
    }
  }, [profile, navigate])

  const onSubmit = async (data: UserFormData) => {
    if (!currentOrganization?.id) {
      setError('root', { message: 'Organization not found' })
      return
    }

    try {
      // Using invite flow - creating a pending user record
      // that gets activated when the user signs up with that email
      const { error: insertError } = await supabase.from('users').insert({
        id: crypto.randomUUID(), // Placeholder until they sign up
        email: data.email,
        role: data.role === 'org_admin' ? 'admin' : data.role, // Map to legacy role temporarily
        org_id: currentOrganization.id,
      } as never)

      if (insertError) {
        throw insertError
      }

      // Reset form and show success
      reset()
      // Could add success state here if needed
    } catch (err: unknown) {
      setError('root', { message: getErrorMessage(err) || 'Failed to create user' })
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        Create User
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Add Coach or Admin
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)}>
            {errors.root && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errors.root.message}
              </Alert>
            )}

            <Box sx={{ mb: 3 }}>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email Address"
                    type="email"
                    fullWidth
                    required
                    placeholder="coach@example.com"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Role</FormLabel>
                    <RadioGroup {...field} row>
                      <FormControlLabel value="coach" control={<Radio />} label="Coach" />
                      <FormControlLabel value="org_admin" control={<Radio />} label="Admin" />
                    </RadioGroup>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                      {field.value === 'coach'
                        ? 'Coaches can view rosters, attendance, and post announcements.'
                        : 'Admins have full access to manage teams, fees, and all organization data.'}
                    </Typography>
                  </FormControl>
                )}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
