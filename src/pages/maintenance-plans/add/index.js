/** Add Maintenance Plan — grid unit × tanggal bulan. */
import MaintenancePlanSchedulePage from 'src/views/apps/maintenance-plan/schedule/MaintenancePlanSchedulePage'

const AddMaintenancePlanPage = () => <MaintenancePlanSchedulePage mode='add' />

AddMaintenancePlanPage.acl = {
  subject: 'maintenance-plan',
  action: 'create'
}

export default AddMaintenancePlanPage
