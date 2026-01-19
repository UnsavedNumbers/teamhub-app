
import { createContext, useContext, ReactNode, useRef } from 'react'

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`pa-tabs-list ${className}`.trim()}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function TabsTrigger({ value, children, className = '', disabled }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const isActive = context.value === value
  const triggerRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    // Get all tab triggers in the same list
    const tabList = triggerRef.current?.parentElement
    if (!tabList) return

    const triggers = Array.from(tabList.querySelectorAll('[role="tab"]:not([disabled])')) as HTMLElement[]
    const index = triggers.indexOf(triggerRef.current as HTMLElement)

    let newIndex = -1

    if (e.key === 'ArrowRight') {
      newIndex = (index + 1) % triggers.length
      e.preventDefault()
    } else if (e.key === 'ArrowLeft') {
      newIndex = (index - 1 + triggers.length) % triggers.length
      e.preventDefault()
    } else if (e.key === 'Home') {
      newIndex = 0
      e.preventDefault()
    } else if (e.key === 'End') {
      newIndex = triggers.length - 1
      e.preventDefault()
    }

    if (newIndex !== -1) {
      triggers[newIndex].focus()
      // Optional: automatically activate (follow focus) or wait for Enter/Space
      // Standard behavior often follows focus for tabs, but we'll stick to manual actvation if preferred.
      // However, usually tabs activate on focus or Enter. Let's stick to click/Enter for activation unless requested otherwise.
      // But standard WAI-ARIA tabs usually activate on focus (automatic) or Enter (manual).
      // Given the requirement "Enter/Space to activate", we will assume manual activation for selection, 
      // but focus moves. 
      // If we want Enter/Space to activate, the button onClick handles it natively for Enter/Space usually if it's a <button>.
    }
  }

  return (
    <button
      ref={triggerRef}
      className={`pa-tabs-trigger ${isActive ? 'active' : ''} ${className}`.trim()}
      onClick={() => !disabled && context.onValueChange(value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      tabIndex={isActive ? 0 : -1}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  if (context.value !== value) return null

  return (
    <div 
      className={`pa-tabs-content ${className}`.trim()} 
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
    >
      {children}
    </div>
  )
}
