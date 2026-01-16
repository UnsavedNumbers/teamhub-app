import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'warning' | 'danger' | 'info'
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  loading?: boolean
  error?: string | null
  onConfirm: (reason: string) => void | Promise<void>
  onCancel: () => void
}

/**
 * Confirmation dialog with required reason input for sensitive actions
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  requireReason = true,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Please provide a reason for this action...',
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  
  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      return // Don't submit without reason
    }
    await onConfirm(reason.trim())
  }
  
  const handleCancel = () => {
    setReason('')
    onCancel()
  }
  
  const getConfirmColor = () => {
    switch (variant) {
      case 'danger':
        return 'error'
      case 'warning':
        return 'warning'
      default:
        return 'primary'
    }
  }
  
  const canConfirm = !loading && (!requireReason || reason.trim().length > 0)

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>{description}</Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {requireReason && (
          <TextField
            fullWidth
            label={reasonLabel}
            placeholder={reasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={3}
            required
            disabled={loading}
            error={reason.trim().length === 0}
            helperText={reason.trim().length === 0 ? 'Reason is required' : ''}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button 
          onClick={handleConfirm} 
          color={getConfirmColor()}
          variant="contained"
          disabled={!canConfirm}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
