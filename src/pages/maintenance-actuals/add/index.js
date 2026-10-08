/**
 * Add Maintenance Actual — plan date, execution, and open findings on the unit.
 */
import { useRouter } from 'next/router'

import MaintenanceActualForm from 'src/views/apps/maintenance-actual/MaintenanceActualForm'

const AddMaintenanceActualPage = () => {
  const router = useRouter()

  return (
    <MaintenanceActualForm
      mode='add'
      onSaved={id => router.push(`/maintenance-actuals/view/${id}`)}
    />
  )
}

AddMaintenanceActualPage.acl = {
  subject: 'maintenance-actual',
  action: 'create'
}

export default AddMaintenanceActualPage
