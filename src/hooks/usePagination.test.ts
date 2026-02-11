import { describe, test, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePagination } from './usePagination'

describe('usePagination', () => {
  test('returns initial state', () => {
    const { result } = renderHook(() => usePagination())
    expect(result.current.page).toBe(0)
    expect(result.current.rowsPerPage).toBe(50)
    expect(result.current.totalCount).toBe(0)
  })

  test('setPage updates page', () => {
    const { result } = renderHook(() => usePagination())
    act(() => {
      result.current.setTotalCount(100)
    })
    act(() => {
      result.current.setPage(1)
    })
    expect(result.current.page).toBe(1)
  })

  test('setRowsPerPage updates rowsPerPage', () => {
    const { result } = renderHook(() => usePagination())
    act(() => {
      result.current.setRowsPerPage(25)
    })
    expect(result.current.rowsPerPage).toBe(25)
  })
})
