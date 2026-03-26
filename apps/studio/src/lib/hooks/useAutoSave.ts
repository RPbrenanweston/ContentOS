// @crumb studio-autosave-hook
// [Hook] | IndexedDB state persistence | Auto-save utility
// why: Persists studio session state across browser refreshes and crashes using IndexedDB
// in:[string key, generic data T, optional debounce ms] out:[void—side-effect only] err:[silent warn on IDB failure]
// hazard: IDB is unavailable in SSR contexts—all exports must only be called client-side
// hazard: Debounce clears on unmount but in-flight IDB transactions are not cancelled
// hazard: No schema versioning on stored values—shape changes will silently load stale data
// edge:apps/studio/src/components/assembly/AssemblyLayout.tsx -> POTENTIAL_CONSUMER
// edge:apps/studio/src/components/logbook/LogbookLayout.tsx -> POTENTIAL_CONSUMER
// prompt: Add schema version field to stored values; clear on version mismatch to avoid stale-state bugs

'use client'

import { useEffect, useCallback, useRef } from 'react'

const DB_NAME = 'studio-autosave'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state')
      }
    }
  })
}

export function useAutoSave<T>(key: string, data: T, debounceMs = 1000) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const save = useCallback(async (value: T) => {
    try {
      const db = await openDB()
      const tx = db.transaction('state', 'readwrite')
      tx.objectStore('state').put(value, key)
    } catch (e) {
      console.warn('[AutoSave] Failed to save:', e)
    }
  }, [key])

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => save(data), debounceMs)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [data, debounceMs, save])
}

export async function loadSavedState<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction('state', 'readonly')
      const request = tx.objectStore('state').get(key)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function clearSavedState(key: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction('state', 'readwrite')
    tx.objectStore('state').delete(key)
  } catch {
    // Silently fail — clearing state is not critical
  }
}
