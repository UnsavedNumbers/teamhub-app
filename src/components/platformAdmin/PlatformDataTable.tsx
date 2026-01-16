import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Card,
  Typography,
  Box,
  Skeleton,
} from '@mui/material'

/**
 * Column configuration for PlatformDataTable
 */
export interface ColumnConfig<T> {
  id: keyof T | string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  minWidth?: number
  render?: (row: T) => React.ReactNode
}

interface PlatformDataTableProps<T extends { id: string }> {
  columns: ColumnConfig<T>[]
  rows: T[]
  loading?: boolean
  emptyMessage?: string
  page: number
  rowsPerPage: number
  totalCount: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
  onRowClick?: (row: T) => void
  orderBy?: string
  order?: 'asc' | 'desc'
  onSort?: (column: string) => void
}

/**
 * Reusable data table with server-side pagination for platform admin pages
 */
export default function PlatformDataTable<T extends { id: string }>({
  columns,
  rows,
  loading = false,
  emptyMessage = 'No data found.',
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
  orderBy,
  order = 'asc',
  onSort,
}: PlatformDataTableProps<T>) {
  const handleSort = (columnId: string) => {
    if (onSort) {
      onSort(columnId)
    }
  }

  // Render loading skeleton
  if (loading && rows.length === 0) {
    return (
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell 
                    key={String(column.id)} 
                    align={column.align || 'left'}
                    sx={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 5 }).map((_, rowIdx) => (
                <TableRow key={`skeleton-${rowIdx}`}>
                  {columns.map((column) => (
                    <TableCell key={`skeleton-${rowIdx}-${String(column.id)}`}>
                      <Skeleton variant="text" width="80%" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    )
  }

  // Render empty state
  if (!loading && rows.length === 0) {
    return (
      <Card>
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            {emptyMessage}
          </Typography>
        </Box>
      </Card>
    )
  }

  return (
    <Card>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell 
                  key={String(column.id)} 
                  align={column.align || 'left'}
                  sx={{ minWidth: column.minWidth }}
                >
                  {column.sortable && onSort ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(String(column.id))}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow 
                key={row.id} 
                hover
                onClick={() => onRowClick?.(row)}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((column) => {
                  const value = column.render 
                    ? column.render(row)
                    : (row as Record<string, unknown>)[String(column.id)]
                  
                  return (
                    <TableCell 
                      key={`${row.id}-${String(column.id)}`} 
                      align={column.align || 'left'}
                    >
                      {value === null || value === undefined ? '—' : String(value)}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[25, 50, 100]}
      />
    </Card>
  )
}
