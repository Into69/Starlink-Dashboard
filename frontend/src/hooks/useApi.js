import { useState, useEffect, useCallback } from 'react'

/**
 * Fetch a REST endpoint and optionally re-poll on an interval.
 *
 * @param {string} url           - e.g. '/api/status'
 * @param {number} intervalMs    - 0 = fetch once, >0 = re-poll
 */
export function useApi(url, intervalMs = 0) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
    if (!intervalMs) return
    const id = setInterval(fetchData, intervalMs)
    return () => clearInterval(id)
  }, [fetchData, intervalMs])

  return { data, loading, error, refetch: fetchData }
}
