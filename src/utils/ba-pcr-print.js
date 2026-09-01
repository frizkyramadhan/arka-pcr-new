/**
 * Helpers for BA PCR print layout — dates, document numbers, project locations.
 */
import { toIsoDateOnly } from 'src/utils/date-format'

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/** Legacy project code → site city for BA PCR letterhead. */
export const PROJECT_LOCATION_MAP = {
  '000H': 'Balikpapan',
  '001H': 'Jakarta',
  '011C': 'Embalut',
  '015C': 'Penajam',
  '016C': 'Sanga-sanga',
  '017C': 'Malinau',
  '018C': 'Bukit Uhud',
  '004W': 'Kariangau',
  '008C': 'Senoni',
  '005P': 'Pratasaba',
  APS: 'Kariangau',
  '019C': 'Sesayap',
  '021C': 'Bogor',
  '022C': 'Melak',
  '023C': 'Muara Lawa',
  '025C': 'Cilacap',
  '026C': 'Melak'
}

export const BA_PCR_DOC_META = {
  docNo: 'ARKA/PLT/IV/13.01',
  revNo: '2',
  effDate: '01 Oktober 2020',
  page: '1 of 1'
}

export const BA_PCR_RECIPIENT = {
  company: 'PT. Arkananta Apta Pratista',
  director: 'Ir. Yuwana Dipowikoro'
}

export function formatBaPcrDateId(value) {
  const iso = toIsoDateOnly(value)
  if (!iso) return '—'

  const [, year, month, day] = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? []

  return `${Number(day)} ${MONTHS_ID[Number(month) - 1]} ${year}`
}

export function formatPlanPeriodShort(planPeriod) {
  const iso = toIsoDateOnly(planPeriod)
  if (!iso) return '—'

  const year = iso.slice(2, 4)
  const month = Number(iso.slice(5, 7))

  return `${MONTHS_SHORT[month - 1]}-${year}`
}

export function formatPlanPeriodIdMonthYear(planPeriod) {
  const iso = toIsoDateOnly(planPeriod)
  if (!iso) return '—'

  const year = iso.slice(0, 4)
  const month = Number(iso.slice(5, 7))

  return `${MONTHS_ID[month - 1]} ${year}`
}

export function formatHmPrint(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return Math.round(num).toLocaleString('id-ID')
}

export function formatCurrencyId(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return `Rp ${Math.round(num).toLocaleString('id-ID')}`
}

export function formatLifeSchedule(lifePercent, hmComponent, policy) {
  const life = Number(lifePercent)
  const hm = Number(hmComponent)
  const pol = Number(policy)

  if (!Number.isFinite(life)) return '—'

  const lifeText = `${life.toFixed(0)}%`
  if (Number.isFinite(hm) && Number.isFinite(pol) && pol > 0) {
    return `${lifeText} (${formatHmPrint(hm)} HM of ${formatHmPrint(pol)} HM)`
  }

  return lifeText
}

export function resolveProjectLocation(projectCode) {
  if (!projectCode) return '—'

  return PROJECT_LOCATION_MAP[projectCode] ?? projectCode
}

export function buildBaPcrDocumentNo(forecast) {
  if (forecast?.noBaPcr) return forecast.noBaPcr

  const iso = toIsoDateOnly(forecast?.baSubmittedAt || forecast?.planPeriod)
  if (!iso || !forecast?.projectCode) return '—'

  const year = iso.slice(0, 4)
  const month = Number(iso.slice(5, 7))

  return `${forecast.idForecast}/PLT-${forecast.projectCode}/PCR/${ROMAN_MONTHS[month - 1]}/${year}`
}

export function buildBaPcrSubject(forecast) {
  const compDesc = forecast?.compDesc ?? forecast?.commod?.comp?.compDesc ?? '—'
  const plantType = forecast?.unit?.plantType || 'Unit'
  const modelName = forecast?.modelName ?? '—'
  const unitNo = forecast?.unitNo ?? '—'
  const warrantySuffix = forecast?.isWarranty ? ' — Pergantian Warranty' : ''

  return `Pengajuan PCR ${compDesc} ${plantType} ${modelName} (${unitNo})${warrantySuffix}`
}

export function buildBaPcrIntro(forecast) {
  const compDesc = forecast?.compDesc ?? forecast?.commod?.comp?.compDesc ?? '—'
  const plantType = forecast?.unit?.plantType || 'Unit'
  const unitNo = forecast?.unitNo ?? '—'
  const site = forecast?.projectCode ?? '—'
  const period = formatPlanPeriodIdMonthYear(forecast?.planPeriod)

  const warrantyClause = forecast?.isWarranty
    ? ' sebagai Pergantian Warranty (approval sampai Plant Manager)'
    : ''

  return `Bersama ini kami sampaikan pengajuan PCR '${compDesc}' unit ${plantType} ${unitNo} site ${site} untuk periode ${period}${warrantyClause}, dengan rincian sebagai berikut:`
}

export function getApprovalByLevel(forecast, level) {
  return forecast?.approvals?.find(row => row.level === level) ?? null
}

export function resolveApproverName(approval, submitter) {
  if (approval?.approver) {
    return approval.approver.fullName || approval.approver.username || ''
  }

  if (submitter) return submitter.fullName || submitter.username || ''

  return ''
}

/** Display name for BA PCR print signature block per level. */
export function resolveSignerName(forecast, level) {
  if (level === 'submitter') {
    if (!forecast?.baSubmittedAt) return ''

    return resolveApproverName(null, forecast.submitter)
  }

  const approval = getApprovalByLevel(forecast, level)
  if (!approval) return ''
  if (approval.status === 'APPROVED' || approval.status === 'REJECTED') {
    return resolveApproverName(approval)
  }

  return ''
}

export function buildEquipmentHealthFlags(forecast) {
  const hasSos = Boolean(forecast?.ratingSos)
  const hasHm = forecast?.latestUnitHm != null || forecast?.hmComponent != null
  const criticalSos = ['C', 'D', 'X', 'U'].includes(String(forecast?.ratingSos ?? '').toUpperCase())

  return {
    ppm: false,
    sos: hasSos,
    magneticPlug: criticalSos,
    filterCut: false,
    data: hasHm,
    inspection: hasSos
  }
}
