/** Edit Maintenance Plan — grid yang sama, centang yang sudah ada dimuat dari query.
 *  Buka halaman cukup maintenance-plan.read. Tanggal baru = create. Ubah/hapus tanggal yang sudah ada = update.
 */
import MaintenancePlanSchedulePage from 'src/views/apps/maintenance-plan/schedule/MaintenancePlanSchedulePage'

const EditMaintenancePlanPage = () => <MaintenancePlanSchedulePage mode='edit' />

EditMaintenancePlanPage.acl = {
  subject: 'maintenance-plan',
  action: 'read'
}

export default EditMaintenancePlanPage
