/** Edit Maintenance Plan — grid yang sama, centang yang sudah ada dimuat dari query. */
import MaintenancePlanSchedulePage from 'src/views/apps/maintenance-plan/schedule/MaintenancePlanSchedulePage'

const EditMaintenancePlanPage = () => <MaintenancePlanSchedulePage mode='edit' />

EditMaintenancePlanPage.acl = {
  subject: 'maintenance-plan',
  action: 'update'
}

export default EditMaintenancePlanPage
