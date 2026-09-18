/**
 * Fetch projects for FMS dropdowns — uses PCR /fleet/projects (session-scoped).
 * Returns { projects: [{ value, label }], loading, error }.
 */
import { useState, useEffect } from 'react'

import arkaApi from 'src/utils/arka-api'

const useProjects = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    arkaApi
      .get('/fleet/projects')
      .then(res => {
        if (cancelled) return
        const raw = res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : []

        const options = list.map(p => {
          const value = p.project_code ?? p.projectCode ?? p.code ?? p.id ?? '-'
          const label = [value, p.bowheer, p.name].filter(Boolean).join(' - ')

          return { value: String(value), label: String(label) }
        })
        setProjects(options)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load projects')
          setProjects([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { projects, loading, error }
}

export default useProjects
