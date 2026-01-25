import { createContext, useContext, useReducer, useMemo, useCallback, ReactNode } from 'react'

interface LoadingStateContextValue {
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

const LoadingStateContext = createContext<LoadingStateContextValue | undefined>(undefined)

type Action = { type: 'increment' } | { type: 'decrement' }

const reducer = (count: number, action: Action): number => {
  switch (action.type) {
    case 'increment':
      return count + 1
    case 'decrement':
      return Math.max(0, count - 1) // Never go below 0
    default:
      return count
  }
}

interface LoadingStateProviderProps {
  children: ReactNode
}

export function LoadingStateProvider({ children }: LoadingStateProviderProps) {
  const [count, dispatch] = useReducer(reducer, 0)

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: loading ? 'increment' : 'decrement' })
  }, [])

  const value = useMemo(() => ({
    isLoading: count > 0,
    setLoading,
  }), [count, setLoading])

  return (
    <LoadingStateContext.Provider value={value}>
      {children}
    </LoadingStateContext.Provider>
  )
}

export function useLoadingState(): LoadingStateContextValue {
  const context = useContext(LoadingStateContext)
  if (context === undefined) {
    throw new Error(
      'useLoadingState must be used within a LoadingStateProvider. ' +
      'Make sure LoadingStateProvider wraps your app in App.tsx'
    )
  }
  return context
}
