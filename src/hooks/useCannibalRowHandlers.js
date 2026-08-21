/**
 * Hook untuk aksi baris cannibal list (view, edit, submit, close, cancel, delete).
 */
import { useCallback, useState } from 'react'

import { useRouter } from 'next/router'

import toast from 'react-hot-toast'

import arkaApi from 'src/utils/arka-api'

const useCannibalRowHandlers = ({ onReload } = {}) => {
  const router = useRouter()
  const [editTarget, setEditTarget] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitRequestorTarget, setSubmitRequestorTarget] = useState(null)
  const [submitRequestorOpen, setSubmitRequestorOpen] = useState(false)
  const [submittingRequestor, setSubmittingRequestor] = useState(false)

  const reload = useCallback(() => {
    onReload?.()
  }, [onReload])

  const openCreate = useCallback(() => {
    setEditTarget(null)
    setDialogOpen(true)
  }, [])

  const handleRowAction = useCallback(
    async (action, row) => {
      if (action === 'view') {
        router.push(`/cannibals/${row.idBa}`)

        return
      }

      if (action === 'edit') {
        try {
          const { data } = await arkaApi.get(`/cannibals/${row.idBa}`)
          setEditTarget(data)
          setDialogOpen(true)
        } catch (error) {
          toast.error('Failed to load BA detail')
        }

        return
      }

      if (action === 'edit-logistic') {
        router.push(`/cannibals/${row.idBa}?logistic=1`)

        return
      }

      if (action === 'submit-to-logistics' || action === 'submit-to-requestor') {
        setSubmitRequestorTarget(row)
        setSubmitRequestorOpen(true)

        return
      }

      if (action === 'confirm-requestor') {
        setConfirmTarget(row)
        setConfirmOpen(true)

        return
      }

      if (action === 'reject-requestor') {
        setRejectTarget(row)
        setRejectConfirmOpen(true)

        return
      }

      if (action === 'execution') {
        router.push(`/cannibals/${row.idBa}`)

        return
      }

      if (action === 'submit') {
        if (!row.mrNo?.trim() || !row.prNo?.trim()) {
          toast.error('MR# and PR# are required before submit for approval')

          return
        }

        try {
          await arkaApi.post(`/cannibals/${row.idBa}/submit`)
          toast.success('BA submitted for approval')
          reload()
        } catch (error) {
          toast.error(error.response?.data?.error ?? 'Submit failed')
        }

        return
      }

      if (action === 'close') {
        try {
          await arkaApi.post(`/cannibals/${row.idBa}/close`)
          toast.success('BA closed')
          reload()
        } catch (error) {
          toast.error(error.response?.data?.error ?? 'Close failed')
        }

        return
      }

      if (action === 'cancel') {
        try {
          await arkaApi.post(`/cannibals/${row.idBa}/cancel`)
          toast.success('BA cancelled')
          reload()
        } catch (error) {
          toast.error(error.response?.data?.error ?? 'Cancel failed')
        }

        return
      }

      if (action === 'delete') {
        setDeleting(true)
        try {
          await arkaApi.delete(`/cannibals/${row.idBa}`)
          toast.success('BA deleted')
          reload()
        } catch (error) {
          toast.error(error.response?.data?.error ?? 'Delete failed')
        } finally {
          setDeleting(false)
        }
      }
    },
    [reload, router]
  )

  const handleSave = useCallback(
    async payload => {
      if (editTarget?.idBa) {
        await arkaApi.put(`/cannibals/${editTarget.idBa}`, payload)
        toast.success('BA updated')
      } else {
        await arkaApi.post('/cannibals', payload)
        toast.success('BA created')
      }
      setDialogOpen(false)
      setEditTarget(null)
      reload()
    },
    [editTarget, reload]
  )

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditTarget(null)
  }, [])

  const closeRejectDialog = useCallback(() => {
    setRejectOpen(false)
    setRejectTarget(null)
  }, [])

  const closeRejectConfirmDialog = useCallback(() => {
    setRejectConfirmOpen(false)
    setRejectTarget(null)
  }, [])

  const closeConfirmDialog = useCallback(() => {
    setConfirmOpen(false)
    setConfirmTarget(null)
  }, [])

  const closeSubmitRequestorDialog = useCallback(() => {
    setSubmitRequestorOpen(false)
    setSubmitRequestorTarget(null)
  }, [])

  const handleSubmitToRequestorProceed = useCallback(async () => {
    if (!submitRequestorTarget?.idBa) return

    setSubmittingRequestor(true)
    try {
      await arkaApi.post(`/cannibals/${submitRequestorTarget.idBa}/submit-to-requestor`)
      toast.success('BA sent to requestor')
      closeSubmitRequestorDialog()
      reload()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Submit to requestor failed')
    } finally {
      setSubmittingRequestor(false)
    }
  }, [closeSubmitRequestorDialog, reload, submitRequestorTarget])

  const handleConfirmRequestorProceed = useCallback(async () => {
    if (!confirmTarget?.idBa) return

    setConfirming(true)
    try {
      await arkaApi.post(`/cannibals/${confirmTarget.idBa}/confirm-requestor`)
      toast.success('Request By confirmed — sent to logistics')
      closeConfirmDialog()
      reload()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Confirm requestor failed')
    } finally {
      setConfirming(false)
    }
  }, [closeConfirmDialog, confirmTarget, reload])

  const handleRejectRequestorProceed = useCallback(() => {
    setRejectConfirmOpen(false)
    setRejectOpen(true)
  }, [])

  const handleRejectRequestor = useCallback(
    async remark => {
      if (!rejectTarget?.idBa) return

      setRejecting(true)
      try {
        await arkaApi.post(`/cannibals/${rejectTarget.idBa}/reject-requestor`, { remark })
        toast.success('Request By rejected — plant may revise and resubmit')
        closeRejectDialog()
        reload()
      } catch (error) {
        toast.error(error.response?.data?.error ?? 'Reject requestor failed')
      } finally {
        setRejecting(false)
      }
    },
    [closeRejectDialog, rejectTarget, reload]
  )

  return {
    editTarget,
    dialogOpen,
    deleting,
    rejectOpen,
    rejecting,
    rejectConfirmOpen,
    rejectTarget,
    confirmOpen,
    confirming,
    confirmTarget,
    submitRequestorOpen,
    submittingRequestor,
    submitRequestorTarget,
    openCreate,
    closeDialog,
    closeRejectDialog,
    closeRejectConfirmDialog,
    closeConfirmDialog,
    closeSubmitRequestorDialog,
    handleRowAction,
    handleSave,
    handleRejectRequestor,
    handleConfirmRequestorProceed,
    handleRejectRequestorProceed,
    handleSubmitToRequestorProceed
  }
}

export default useCannibalRowHandlers
