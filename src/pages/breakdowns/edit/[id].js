/**
 * Edit an open breakdown. Project, unit, and start time stay fixed.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import CircularProgress from '@mui/material/CircularProgress'
import toast from 'react-hot-toast'

import arkaApi from 'src/utils/arka-api'
import BreakdownForm from 'src/views/apps/breakdown/BreakdownForm'

const EditBreakdownPage = () => {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  const [row, setRow] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const refreshWo = async () => {
    if (!id || refreshing) return
    setRefreshing(true)
    try {
      const response = await arkaApi.post(`/breakdowns/${id}/refresh`)
      setRow(response.data)
      setFormKey(value => value + 1)
      toast.success('Work order refreshed from SAP')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not refresh the work order')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!id) return
    let active = true
    arkaApi
      .get(`/breakdowns/${id}`)
      .then(response => {
        if (active) setRow(response.data)
      })
      .catch(error => {
        toast.error(error?.response?.data?.error || 'Breakdown was not found')
      })

    return () => {
      active = false
    }
  }, [id])

  if (!row) return <CircularProgress />

  return (
    <BreakdownForm
      key={formKey}
      mode='edit'
      initial={row}
      refreshing={refreshing}
      onRefresh={refreshWo}
      onSaved={() => router.push(`/breakdowns/view/${id}`)}
      onCancel={() => router.push(`/breakdowns/view/${id}`)}
    />
  )
}

EditBreakdownPage.acl = {
  subject: 'breakdown',
  action: 'update'
}

export default EditBreakdownPage
