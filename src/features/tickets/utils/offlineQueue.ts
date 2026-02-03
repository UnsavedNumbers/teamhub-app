/**
 * Offline Queue Utilities
 * 
 * Uses IndexedDB for persistent storage of pending validations across page refreshes.
 * Uses native IndexedDB API to avoid external dependencies.
 */

const DB_NAME = 'ticket-scanner-offline'
const STORE_NAME = 'pendingValidations'
const DB_VERSION = 1

let dbInstance: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export interface QueueValidationParams {
  qr_token?: string
  entry_code?: string
  selected_event_id: string
}

export interface QueuedValidation {
  id: string
  qr_token?: string
  entry_code?: string
  selected_event_id: string
  timestamp: number
  attempts: number
}

/**
 * Queue a validation for later processing
 */
export async function queueValidation(params: QueueValidationParams): Promise<string> {
  const database = await getDB()
  
  const entry: QueuedValidation = {
    id: crypto.randomUUID(),
    qr_token: params.qr_token,
    entry_code: params.entry_code,
    selected_event_id: params.selected_event_id,
    timestamp: Date.now(),
    attempts: 0,
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(entry)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Failed to queue validation'))
  })
  return entry.id
}

/**
 * Get count of pending validations
 */
export async function getPendingCount(): Promise<number> {
  try {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.count()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('Failed to count pending'))
    })
  } catch {
    return 0
  }
}

/**
 * Get all pending validations
 */
export async function getAllPending(): Promise<QueuedValidation[]> {
  try {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result as QueuedValidation[])
      request.onerror = () => reject(new Error('Failed to get pending'))
    })
  } catch {
    return []
  }
}

/**
 * Remove a pending validation
 */
export async function removePending(id: string): Promise<void> {
  try {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to remove pending'))
    })
  } catch {
    // Ignore errors
  }
}

/**
 * Increment attempt count for a pending validation
 */
export async function incrementAttempts(id: string): Promise<void> {
  try {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const getRequest = store.get(id)
      
      getRequest.onsuccess = () => {
        const entry = getRequest.result as QueuedValidation | undefined
        if (entry) {
          entry.attempts++
          const putRequest = store.put(entry)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(new Error('Failed to update attempts'))
        } else {
          resolve()
        }
      }
      
      getRequest.onerror = () => reject(new Error('Failed to get entry'))
    })
  } catch {
    // Ignore errors
  }
}

/**
 * Sync pending validations with server
 * 
 * @param validateFn - Function to call for each validation
 * @returns Results of sync attempts
 */
export async function syncPendingValidations(
  validateFn: (params: QueueValidationParams) => Promise<{ data: any; error: Error | null }>
): Promise<Array<{ id: string; success: boolean; response?: any; error?: string }>> {
  const pending = await getAllPending()
  const results: Array<{ id: string; success: boolean; response?: any; error?: string }> = []
  
  for (const entry of pending) {
    try {
      const response = await validateFn({
        qr_token: entry.qr_token,
        entry_code: entry.entry_code,
        selected_event_id: entry.selected_event_id,
      })
      
      if (response.error) {
        throw response.error
      }
      
      await removePending(entry.id)
      
      results.push({
        id: entry.id,
        success: true,
        response: response.data,
      })
    } catch (error: any) {
      await incrementAttempts(entry.id)
      
      results.push({
        id: entry.id,
        success: false,
        error: error.message || 'Validation failed',
      })
      
      // Stop sync if network is down
      if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
        break
      }
    }
  }
  
  return results
}
