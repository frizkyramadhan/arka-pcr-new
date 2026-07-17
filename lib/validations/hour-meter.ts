import { z } from 'zod'

const hourMeterSchemaBase = z.object({
  fleetUnitId: z.coerce.number().int().positive().optional(),
  fleetEquipmentId: z.coerce.number().int().positive().optional(),
  hmUnit: z.coerce.number().nonnegative(),
  whDay: z.coerce.number().int().min(0).max(24),
  dateHm: z.coerce.date()
})

export const hourMeterSchema = hourMeterSchemaBase
  .transform(({ fleetUnitId, fleetEquipmentId, ...rest }) => ({
    ...rest,
    fleetUnitId: fleetUnitId ?? fleetEquipmentId!
  }))

export const hourMeterUpdateSchema = hourMeterSchemaBase.partial().refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required'
})

export type HourMeterInput = z.infer<typeof hourMeterSchema>
