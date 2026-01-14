import { Skeleton, Table, TableBody, TableCell, TableRow, TableHead, TableContainer, Paper } from '@mui/material'

interface AdminSkeletonTableProps {
  rows?: number
  columns?: number
}

/**
 * Skeleton loading table for admin panel
 * Uses Material Dashboard styling
 */
export default function AdminSkeletonTable({ rows = 5, columns = 4 }: AdminSkeletonTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableCell key={i}>
                <Skeleton variant="text" width="100%" />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: columns }).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton variant="text" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
