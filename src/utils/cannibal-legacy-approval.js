/**
 * Client re-exports — legacy OPEN BA approval seed (admin/superuser only).
 */
import { CANNIBAL_BA_APPROVAL_CHAIN } from 'src/utils/approval-registry'

export {
  hasLegacyCannibalApprovalSeedRole,
  isLegacyOpenUnapprovedBa,
  showLegacyApprovalSeedAction
} from '@/lib/cannibal/legacy-approval'

function buildCannibalApprovalStepsList() {
  const levels = CANNIBAL_BA_APPROVAL_CHAIN.levels
  const bullets = levels.map(item => `• ${item.label}`).join('\n')

  return { count: levels.length, bullets }
}

/** Copy for admin seed-approval confirmation dialog (detail BA & approval pages). */
export function getLegacyApprovalSeedConfirmDialog(noBa) {
  const baNo = noBa?.trim() || '—'
  const { count, bullets } = buildCannibalApprovalStepsList()

  return {
    title: 'Enable approval workflow?',
    message: `BA ${baNo} was migrated from the legacy system and has no approval records in the new workflow yet.

If you continue, the system will create ${count} approval steps (all set to Pending):
${bullets}

Approvers can then process this BA from the Cannibal Approvals menu.`,
    confirmLabel: 'Continue'
  }
}

/** Warning saat Review dari queue approval — BA legacy belum punya chain. */
export function getLegacyApprovalQueueReviewDialog(noBa, canInit) {
  const baNo = noBa?.trim() || '—'

  if (canInit) {
    return {
      title: 'Legacy BA — Init Approval Chain Required',
      alert: 'BA ini berasal dari sistem lama dan belum memiliki approval chain di workflow baru.',
      message: `BA ${baNo} berstatus OPEN di sistem lama tetapi belum pernah disetujui siapa pun, sehingga tidak dapat dibuka untuk review approval.

Sebagai Head Office, lakukan Init Approval Chain terlebih dahulu agar approver dapat memproses BA ini dari menu Cannibal Approvals.`,
      confirmLabel: 'Init Approval Chain',
      showInit: true
    }
  }

  return {
    title: 'Legacy BA — Menunggu Head Office',
    alert: 'Approval chain belum diinisialisasi untuk BA ini.',
    message: `BA ${baNo} berasal dari sistem lama dan belum memiliki approval chain di workflow baru, sehingga review approval belum dapat dibuka.

Hubungi Head Office (administrator / superuser) untuk melakukan Init Approval Chain pada BA ini.`,
    confirmLabel: 'Mengerti',
    showInit: false
  }
}
