/**
 * usePagination Hook
 * 
 * Manages pagination state with automatic validation and adjustment.
 * Prevents invalid page numbers when data changes.
 * 
 * Technical Bug Prevention #4: Pagination State Bugs - Page Numbers Out of Sync
 */

import { useState, useEffect, useCallback } from 'react'

/**
 * Pagination state and controls
 */
export interface PaginationState {
  page: number
  rowsPerPage: number
  totalCount: number
  setPage: (page: number) => void
  setRowsPerPage: (rowsPerPage: number) => void
  setTotalCount: (totalCount: number) => void
}

/**
 * Hook that manages pagination state with automatic validation
 * 
 * @param initialPage - Initial page number (default: 0)
 * @param initialRowsPerPage - Initial rows per page (default: 50)
 * @returns Pagination state and setter functions
 * 
 * @example
 * ```tsx
 * const { page, rowsPerPage, totalCount, setPage, setRowsPerPage, setTotalCount } = usePagination()
 * 
 * // Fetch data
 * useEffect(() => {
 *   fetchData(page, rowsPerPage).then(data => {
 *     setTotalCount(data.totalCount)
 *   })
 * }, [page, rowsPerPage])
 * ```
 */
export function usePagination(
  initialPage = 0,
  initialRowsPerPage = 50
): PaginationState {
  const [page, setPageState] = useState(initialPage)
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage)
  const [totalCount, setTotalCount] = useState(0)

  // Validate and adjust page number when total count or rows per page changes
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(totalCount / rowsPerPage) - 1)
    if (page > maxPage && maxPage >= 0) {
      setPageState(maxPage)
    }
  }, [totalCount, rowsPerPage, page])

  // Safe page change handler that validates against max page
  const handlePageChange = useCallback((newPage: number) => {
    const maxPage = Math.max(0, Math.ceil(totalCount / rowsPerPage) - 1)
    setPageState(Math.max(0, Math.min(newPage, maxPage)))
  }, [totalCount, rowsPerPage])

  return {
    page,
    rowsPerPage,
    totalCount,
    setPage: handlePageChange,
    setRowsPerPage,
    setTotalCount,
  }
}
