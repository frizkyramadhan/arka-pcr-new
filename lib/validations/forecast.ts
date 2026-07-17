import { z } from 'zod'

const priceComponentField = z.preprocess(
  val => {
    if (val === '' || val === null || val === undefined) return undefined
    const num = Number(val)

    return Number.isFinite(num) && num >= 0 ? num : undefined
  },
  z.number().nonnegative().optional()
)

/** Update: empty/null clears stored price. */
const priceComponentUpdateField = z.preprocess(
  val => {
    if (val === '' || val === null || val === undefined) return null
    const num = Number(val)

    return Number.isFinite(num) && num >= 0 ? num : undefined
  },
  z.number().nonnegative().nullable().optional()
)

export const forecastCreateSchema = z.object({
  fleetUnitId: z.coerce.number().int().positive().optional(),
  fleetEquipmentId: z.coerce.number().int().positive().optional(),
  idMod: z.coerce.number().int().positive(),
  priceComponent: priceComponentField,  planPeriod: z.preprocess(
    val => {
      if (typeof val === 'string' && /^\d{4}-\d{2}$/.test(val)) {
        return `${val}-01`
      }

      return val
    },
    z.coerce.date()
  ),
  quarter: z.string().trim().max(2).optional(),
  remark: z.string().trim().max(5000).optional().nullable(),
  idRep: z.coerce.number().int().positive().optional()
}).transform(({ fleetUnitId, fleetEquipmentId, ...rest }) => ({
  ...rest,
  fleetUnitId: fleetUnitId ?? fleetEquipmentId!
}))

export const forecastUpdateSchema = z
  .object({
    planPeriod: z.preprocess(
      val => {
        if (typeof val === 'string' && /^\d{4}-\d{2}$/.test(val)) {
          return `${val}-01`
        }

        return val
      },
      z.coerce.date()
    ).optional(),
    quarter: z.string().trim().max(2).optional(),
    remark: z.string().trim().max(5000).optional().nullable(),
    priceComponent: priceComponentUpdateField
  })  .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required' })

export const forecastCloseSchema = z.object({
  remark: z.string().trim().max(5000).optional().nullable()
})

export const forecastSubmitBaSchema = z.object({
  sequence: z.coerce.number().int().positive().optional()
})

export const forecastGenerateSchema = z.object({
  fleetUnitId: z.coerce.number().int().positive().optional().nullable(),
  projectCode: z.string().trim().max(10).optional().nullable(),
  quarter: z.string().trim().max(2).optional().nullable(),
  planPeriod: z.coerce.date().optional(),
  lifeThreshold: z.coerce.number().min(0).max(200).default(100)
})

export type ForecastCreateInput = z.infer<typeof forecastCreateSchema>

export type ForecastUpdateInput = z.infer<typeof forecastUpdateSchema>

export type ForecastCloseInput = z.infer<typeof forecastCloseSchema>

export type ForecastSubmitBaInput = z.infer<typeof forecastSubmitBaSchema>

export type ForecastGenerateInput = z.infer<typeof forecastGenerateSchema>
