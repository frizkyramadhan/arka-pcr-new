/**
 * Edit Maintenance Actual — same form as add, including open findings and follows.
 */
import { useRouter } from 'next/router'

import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

import MaintenanceActualForm from 'src/views/apps/maintenance-actual/MaintenanceActualForm'

const EditMaintenanceActualPage = () => {
  const router = useRouter()
  const { id } = router.query

  if (!id) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 16 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <MaintenanceActualForm
      mode='edit'
      actualId={String(id)}
      onSaved={savedId => router.push(`/maintenance-actuals/view/${savedId}`)}
    />
  )
}

EditMaintenanceActualPage.acl = {
  subject: 'maintenance-actual',
  action: 'update'
}

export default EditMaintenanceActualPage
