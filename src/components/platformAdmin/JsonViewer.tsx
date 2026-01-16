import { useState } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Paper,
} from '@mui/material'
import { 
  ExpandMore as ExpandMoreIcon, 
  ExpandLess as ExpandLessIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material'

interface JsonViewerProps {
  data: Record<string, unknown> | null | undefined
  title?: string
  defaultExpanded?: boolean
  maxHeight?: number
}

/**
 * Collapsible JSON viewer for audit log metadata
 */
export default function JsonViewer({
  data,
  title = 'Metadata',
  defaultExpanded = false,
  maxHeight = 200,
}: JsonViewerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)
  
  if (!data || Object.keys(data).length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No metadata
      </Typography>
    )
  }
  
  const jsonString = JSON.stringify(data, null, 2)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <Box>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer',
          gap: 1,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="body2" fontWeight={500}>
          {title}
        </Typography>
        {expanded ? (
          <ExpandLessIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
        <Typography variant="caption" color="textSecondary">
          ({Object.keys(data).length} keys)
        </Typography>
      </Box>
      
      <Collapse in={expanded}>
        <Paper 
          variant="outlined" 
          sx={{ 
            mt: 1, 
            p: 1.5,
            maxHeight,
            overflow: 'auto',
            position: 'relative',
          }}
        >
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{ 
              position: 'absolute', 
              top: 4, 
              right: 4,
            }}
            title={copied ? 'Copied!' : 'Copy JSON'}
          >
            <CopyIcon fontSize="small" />
          </IconButton>
          <Box
            component="pre"
            sx={{
              margin: 0,
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {jsonString}
          </Box>
        </Paper>
      </Collapse>
    </Box>
  )
}
