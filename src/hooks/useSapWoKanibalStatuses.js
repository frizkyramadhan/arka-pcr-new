/**
 * Live SAP WO status for cannibal REMOVE/INSTALL WO# fields.
 */
import { useEffect, useState } from 'react'

import {
  fetchSapWoStatus,
  hasDocNumValue,
  normalizeDocNumValue
} from 'src/views/pcr/sap/sap-document-utils'

const emptyStatuses = () => ({ remove: null, install: null })

export function useSapWoKanibalStatuses({ removeWoNo, installWoNo, enabled = true }) {
  const [statuses, setStatuses] = useState(emptyStatuses)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setStatuses(emptyStatuses())
      setLoading(false)

      return
    }

    const remove = normalizeDocNumValue(removeWoNo)
    const install = normalizeDocNumValue(installWoNo)

    if (!hasDocNumValue(remove) && !hasDocNumValue(install)) {
      setStatuses(emptyStatuses())
      setLoading(false)

      return
    }

    const controller = new AbortController()
    let active = true

    const load = async () => {
      setLoading(true)

      try {
        const [removeStatus, installStatus] = await Promise.all([
          hasDocNumValue(remove) ? fetchSapWoStatus(remove, controller.signal) : Promise.resolve(null),
          hasDocNumValue(install) ? fetchSapWoStatus(install, controller.signal) : Promise.resolve(null)
        ])

        if (!active) return

        setStatuses({
          remove: removeStatus,
          install: installStatus
        })
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
      controller.abort()
    }
  }, [enabled, installWoNo, removeWoNo])

  return { statuses, loading }
}

export default useSapWoKanibalStatuses
