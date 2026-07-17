/**

 * Approve / reject / revoke handlers for Cannibal BA approval UI.

 */

import { useCallback, useMemo, useState } from 'react'



import toast from 'react-hot-toast'



import arkaApi from 'src/utils/arka-api'

import { CANNIBAL_APPROVE_PERMISSIONS } from 'src/utils/forecast-approval-auth'

import { findActionableCannibalApproval } from 'src/utils/cannibal-approval-workflow'



import { useAuth } from 'src/hooks/useAuth'

import useCan from 'src/hooks/useCan'



export default function useCannibalApprovalActions({ onSuccess } = {}) {

  const { can } = useCan()

  const auth = useAuth()

  const [loading, setLoading] = useState(false)



  const approveLevels = useMemo(

    () => CANNIBAL_APPROVE_PERMISSIONS.filter(code => can(code)).map(code => code.replace('cannibals.approve.', '')),

    [can]

  )



  const findPendingApproval = useCallback(

    ba => findActionableCannibalApproval(ba, approveLevels, can, auth.user),

    [approveLevels, can, auth.user]

  )



  const handleApprove = useCallback(

    async (approval, remark) => {

      if (!approval?.idBaApproval) return



      setLoading(true)

      try {

        await arkaApi.post(`/approvals/${approval.idBaApproval}/approve`, { remark: remark ?? null })

        toast.success(approval.actionMode === 'revise' ? 'Approval updated' : 'Approved')

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

    async (approval, remark) => {

      if (!approval?.idBaApproval) return



      setLoading(true)

      try {

        await arkaApi.post(`/approvals/${approval.idBaApproval}/reject`, { remark: remark ?? null })

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



  const handleRevoke = useCallback(

    async approval => {

      if (!approval?.idBaApproval) return



      setLoading(true)

      try {

        await arkaApi.post(`/approvals/${approval.idBaApproval}/revoke`)

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

    loading,

    handleApprove,

    handleReject,

    handleRevoke

  }

}


