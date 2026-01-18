import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface SidebarContextType {
  expandedSections: Set<string>
  toggleSection: (sectionLabel: string) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Check localStorage for persisted state
    const stored = localStorage.getItem('sidebar-expanded-sections')
    if (stored) {
      try {
        return new Set(JSON.parse(stored))
      } catch {
        return new Set()
      }
    }
    // Default: expand Overview and Management sections
    return new Set(['Overview', 'Management'])
  })

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-expanded-sections', JSON.stringify(Array.from(expandedSections)))
  }, [expandedSections])

  const toggleSection = (sectionLabel: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionLabel)) {
        next.delete(sectionLabel)
      } else {
        next.add(sectionLabel)
      }
      return next
    })
  }

  return (
    <SidebarContext.Provider value={{ expandedSections, toggleSection }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}
