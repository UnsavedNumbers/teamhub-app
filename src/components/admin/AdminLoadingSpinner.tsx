import { CircularProgress, Box } from '@mui/material'

/**
 * Loading spinner component for admin panel
 * Uses Material Dashboard styling
 */
export default function AdminLoadingSpinner() {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        width: '100%'
      }}
    >
      <CircularProgress />
    </Box>
  )
}
