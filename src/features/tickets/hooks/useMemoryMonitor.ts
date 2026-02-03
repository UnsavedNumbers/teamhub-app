/**
 * Memory Monitor Hook
 * 
 * Monitors JavaScript heap size and warns when memory usage is high.
 * Only works in Chrome/Chromium browsers.
 */

import { useState, useEffect } from 'react'

interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface PerformanceMemory extends Performance {
  memory?: MemoryInfo
}

export interface UseMemoryMonitorReturn {
  showWarning: boolean
  heapSize: number | null
  dismissWarning: () => void
}

/**
 * Hook to monitor memory usage
 * 
 * @param warningThresholdMB - Threshold in MB to show warning (default: 500)
 * @returns Memory monitoring state and controls
 */
export function useMemoryMonitor(warningThresholdMB = 500): UseMemoryMonitorReturn {
  const [showWarning, setShowWarning] = useState(false)
  const [heapSize, setHeapSize] = useState<number | null>(null)
  
  useEffect(() => {
    // Only works in Chrome
    const perf = performance as PerformanceMemory
    if (!perf.memory) {
      return
    }
    
    const checkMemory = () => {
      const memory = perf.memory!
      // usedJSHeapSize is in bytes
      const usedMB = memory.usedJSHeapSize / (1024 * 1024)
      setHeapSize(Math.round(usedMB))
      
      if (usedMB > warningThresholdMB) {
        setShowWarning(true)
      }
    }
    
    // Check every 30 minutes
    const interval = setInterval(checkMemory, 30 * 60 * 1000)
    
    // Initial check after 5 minutes
    const timeout = setTimeout(checkMemory, 5 * 60 * 1000)
    
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [warningThresholdMB])
  
  return { 
    showWarning, 
    heapSize, 
    dismissWarning: () => setShowWarning(false) 
  }
}
