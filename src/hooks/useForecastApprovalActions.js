/**
 * Approve / reject handlers for BA PCR forecast approval UI.
 */
import { useCallback, useMemo, useState } from 'react'

import toast from 'react-hot-toast'

import arkaApi from 'src/utils/arka-api'
import {
  findPendingApprovalForUser,
  getApproveLevelsFromCan
} from 'src/utils/forecast-approval-auth'

import useCan from 'src/hooks/useCan'

export default function useForecastApprovalActions({ onSuccess } = {}) {
  const { can } = useCan()
  const [rejectTarget, setRejectTarget] = useState(null)
  const [loading, setLoading] = useState(false)

  const approveLevels = useMemo(() => getApproveLevelsFromCan(can), [can])

  const findPendingApproval = useCallback(
    forecast => findPendingApprovalForUser(forecast, approveLevels, can),
    [approveLevels, can]
  )

  const handleApprove = useCallback(
    async (approval, note) => {
      if (!approval?.idForecastApproval) return

      setLoading(true)
      try {
        await arkaApi.post(`/forecast-approvals/${approval.idForecastApproval}/approve`, { note })
        toast.success('Approved')
        onSuccess?.()
      } catch (error) {
        toast.error(error.response?.data?.error ?? 'Approve failed')
      } finally {
        setLoading(false)
      }
    },
    [onSuccess]
  )

  const handleReject = useCallback(
    async (approval, note) => {
      if (!approval?.idForecastApproval) return

      setLoading(true)
      try {
        await arkaApi.post(`/forecast-approvals/${approval.idForecastApproval}/reject`, { note })
        toast.success('Rejected')
        onSuccess?.()
      } catch (error) {
        toast.error(error.response?.data?.error ?? 'Reject failed')
      } finally {
        setLoading(false)
      }
    },
    [onSuccess]
  )

  const handleRejectConfirm = useCallback(
    async note => {
      if (!rejectTarget?.idForecastApproval) return

      await handleReject(rejectTarget, note)
      setRejectTarget(null)
    },
    [handleReject, rejectTarget]
  )

  const handleRevoke = useCallback(
    async approval => {
      if (!approval?.idForecastApproval) return

      setLoading(true)
      try {
        await arkaApi.post(`/forecast-approvals/${approval.idForecastApproval}/revoke`)
        toast.success('Approval revoked')
        onSuccess?.()
      } catch (error) {
        toast.error(error.response?.data?.error ?? 'Revoke failed')
      } finally {
        setLoading(false)
      }
    },
    [onSuccess]
  )

  return {
    approveLevels,
    findPendingApproval,
    rejectTarget,
    setRejectTarget,
    loading,
    handleApprove,
    handleReject,
    handleRejectConfirm,
    handleRevoke
  }
}
