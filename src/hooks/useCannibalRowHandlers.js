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

      if (action === 'submit-to-logistics') {
        try {
          await arkaApi.post(`/cannibals/${row.idBa}/submit-to-logistics`)
          toast.success('BA sent to logistics')
          reload()
        } catch (error) {
          toast.error(error.response?.data?.error ?? 'Submit to logistics failed')
        }

        return
      }

      if (action === 'execution') {
        router.push(`/cannibals/${row.idBa}`)

        return
      }

      if (action === 'submit') {
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

  return {
    editTarget,
    dialogOpen,
    deleting,
    openCreate,
    closeDialog,
    handleRowAction,
    handleSave
  }
}

export default useCannibalRowHandlers
