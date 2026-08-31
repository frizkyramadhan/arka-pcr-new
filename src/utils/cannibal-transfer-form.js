/**
 * Form state helpers — satu komponen per BA (REMOVE + INSTALL).
 */

export const emptySide = () => ({
  unitProjectCode: '',
  fleetUnitId: '',
  date: new Date().toISOString().slice(0, 10),
  compDesc: '',
  pn: '',
  sn: '',
  pos: '',
  hmComp: 0,
  idRep: '',
  woNoKanibal: '',
  woStatusKanibal: ''
})

export const emptyTransfer = () => ({
  remove: emptySide(),
  install: emptySide()
})

/** Normalisasi fleet unit id untuk MUI Select (string, konsisten dengan MenuItem value). */
export const normalizeFleetUnitId = value => {
  if (value == null || value === '') return ''

  const id = Number(value)

  return Number.isFinite(id) && id > 0 ? String(id) : ''
}

export const mapSideFromLine = line => ({
  unitProjectCode: line.unitProjectCode ?? line.unit?.projectCode ?? '',
  fleetUnitId: normalizeFleetUnitId(line.fleetUnitId ?? line.fleetEquipmentId),
  unitNo: line.unitNo ?? line.unit?.unitNo ?? '',
  date: line.date ? String(line.date).slice(0, 10) : '',
  compDesc: line.compDesc ?? '',
  pn: line.pn ?? '',
  sn: line.sn ?? '',
  pos: line.pos ?? '',
  hmComp: line.hmComp ?? 0,
  idRep: line.idRep ?? '',
  woNoKanibal: line.woNoKanibal ?? '',
  woStatusKanibal: line.woStatusKanibal ?? ''
})

/** Ambil transfer tunggal dari response BA (pair pertama / legacy). */
export function getSingleTransfer(data) {
  if (!data) return emptyTransfer()

  if (data.pairs?.length) {
    const pair = data.pairs[0]

    return {
      remove: mapSideFromLine(pair.remove ?? {}),
      install: mapSideFromLine(pair.install ?? {})
    }
  }

  const lines = data.kanibals ?? []
  const transfer = emptyTransfer()

  lines.forEach(line => {
    if (line.type === 'REMOVE') transfer.remove = mapSideFromLine(line)
    if (line.type === 'INSTALL') transfer.install = mapSideFromLine(line)
  })

  return transfer
}

/** Shared component fields — diambil dari sisi REMOVE (sumber kebenaran UI). */
export function getSharedComponentFields(transfer) {
  const remove = transfer?.remove ?? {}

  return {
    compDesc: remove.compDesc ?? '',
    pn: remove.pn ?? '',
    sn: remove.sn ?? '',
    pos: remove.pos ?? ''
  }
}

export function applySharedComponentFields(transfer, shared) {
  return {
    remove: { ...transfer.remove, ...shared },
    install: { ...transfer.install, ...shared }
  }
}

export function buildTransferPayload(transfer) {
  const mapSide = side => {
    const fleetUnitId = Number(side.fleetUnitId)

    return {
      fleetUnitId,
      date: side.date,
      compDesc: side.compDesc,
      pn: side.pn,
      sn: side.sn,
      pos: side.pos,
      hmComp: Number(side.hmComp) || 0,
      idRep: side.idRep === '' ? null : Number(side.idRep),
      woNoKanibal: side.woNoKanibal || null,
      woStatusKanibal: side.woStatusKanibal || undefined
    }
  }

  return {
    remove: mapSide(transfer.remove),
    install: mapSide(transfer.install)
  }
}

/** Unit options scoped to a side's unit project (keeps edit selections visible). */
export function equipmentsForSide(equipments, projectCode, side, pairLine) {
  if (!projectCode) return []

  const byId = new Map(
    equipments.filter(eq => eq.project_code === projectCode).map(eq => [Number(eq.id), eq])
  )

  const id = Number(side?.fleetUnitId)
  if (id && !byId.has(id)) {
    byId.set(id, {
      id,
      unit_no: side?.unitNo ?? pairLine?.unitNo ?? pairLine?.unit?.unitNo ?? `Unit #${id}`,
      project_code: projectCode
    })
  }

  return [...byId.values()].sort((a, b) => String(a.unit_no).localeCompare(String(b.unit_no)))
}

/** @deprecated Use equipmentsForSide — kept for callers that still pass a full transfer. */
export function equipmentsForProject(equipments, projectCode, transfer, pairLines) {
  return equipmentsForSide(equipments, projectCode, transfer?.remove, pairLines?.remove)
}
