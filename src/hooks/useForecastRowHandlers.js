/**
 * Hook + handler untuk aksi baris forecast (refresh, submit BA, convert, close, delete).
 */
import { useCallback, useState } from 'react'

import { useRouter } from 'next/router'

import toast from 'react-hot-toast'

import arkaApi from 'src/utils/arka-api'

import { useAuth } from 'src/hooks/useAuth'
import useCan from 'src/hooks/useCan'

const useForecastRowHandlers = ({ onReload, fleetId } = {}) => {
  const router = useRouter()
  const auth = useAuth()
  const { can } = useCan()
  const userId = auth.user?.id

  const [closeTarget, setCloseTarget] = useState(null)
  const [convertTarget, setConvertTarget] = useState(null)
  const [submitBaTarget, setSubmitBaTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const reload = useCallback(() => {
    onReload?.()
  }, [onReload])

  const handleRowAction = useCallback(
    async (action, row) => {
      try {
        if (action === 'view') {
          const query = fleetId ? `?from=unit&fleetId=${fleetId}` : ''
          router.push(`/forecasts/${row.idForecast}${query}`)

          return
        }

        if (action === 'refresh') {
          await arkaApi.post(`/forecasts/${row.idForecast}/refresh`)
          toast.success('Metrics refreshed')
          reload()

          return
        }

        if (action === 'submit-ba') {
          setSubmitBaTarget(row)

          return
        }

        if (action === 'convert') {
          setConvertTarget(row)

          return
        }

        if (action === 'close') {
          setCloseTarget(row)

          return
        }

        if (action === 'delete') {
          setDeleteTarget(row)

          return
        }

        if (action === 'view-wo') {
          const unitId = fleetId ?? row.fleetUnitId
          if (unitId && row.idMod) {
            router.push(`/units/${unitId}/replacements/${row.idMod}`)
          } else if (row.idRep) {
            router.push(`/units/${unitId}/replacements`)
          }

          return
        }

        reload()
      } catch (error) {
        toast.error(error.response?.data?.error ?? 'Action failed')
      }
    },
    [fleetId, reload, router]
  )

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      await arkaApi.delete(`/forecasts/${deleteTarget.idForecast}`)
      toast.success('Forecast deleted')
      setDeleteTarget(null)
      reload()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleConvertSuccess = data => {
    toast.success('Converted to replacement WO')
    reload()
    const unitId = fleetId ?? data?.fleetUnitId ?? convertTarget?.fleetUnitId
    if (data?.idRep && unitId) {
      router.push(`/units/${unitId}/replacements`)
    }
    setConvertTarget(null)
  }

  return {
    can,
    userId,
    closeTarget,
    setCloseTarget,
    convertTarget,
    setConvertTarget,
    submitBaTarget,
    setSubmitBaTarget,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleRowAction,
    handleDeleteConfirm,
    handleConvertSuccess
  }
}

export default useForecastRowHandlers
