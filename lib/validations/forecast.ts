import { z } from 'zod'

import {
  PCR_SUPPLY_CATEGORIES,
  REPAIR_LIFE_MODES,
  REPAIR_SITES,
  REPAIR_VENDOR_KINDS,
  refinePcrSupplyFields
} from '@/lib/forecasts/pcr-supply'
import { parsePriceComponentValue } from '@/lib/utils/price-component'

const emptyToNull = (val: unknown) => (val === '' ? null : val)

const pcrSupplyFieldsSchema = {
  pcrSupplyCategory: z.preprocess(emptyToNull, z.enum(PCR_SUPPLY_CATEGORIES).optional().nullable()),
  repairSite: z.preprocess(emptyToNull, z.enum(REPAIR_SITES).optional().nullable()),
  repairVendorKind: z.preprocess(emptyToNull, z.enum(REPAIR_VENDOR_KINDS).optional().nullable()),
  repairDealerName: z.preprocess(emptyToNull, z.string().trim().max(100).optional().nullable()),
  repairLifeMode: z.preprocess(emptyToNull, z.enum(REPAIR_LIFE_MODES).optional().nullable())
}

const priceComponentField = z.preprocess(
  val => parsePriceComponentValue(val),
  z.number().nonnegative().optional()
)

/** Update: empty/null clears stored price. */
const priceComponentUpdateField = z.preprocess(
  val => {
    if (val === '' || val === null || val === undefined) return null

    return parsePriceComponentValue(val)
  },
  z.number().nonnegative().nullable().optional()
)

export const forecastCreateSchema = z.object({
  fleetUnitId: z.coerce.number().int().positive().optional(),
  fleetEquipmentId: z.coerce.number().int().positive().optional(),
  idMod: z.coerce.number().int().positive(),
  priceComponent: priceComponentField,
  planPeriod: z.preprocess(
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
  idRep: z.coerce.number().int().positive().optional(),
  isWarranty: z.boolean().optional().default(false),
  ...pcrSupplyFieldsSchema
})
  .superRefine((data, ctx) => {
    if (data.isWarranty) return
    refinePcrSupplyFields(data, ctx, true)
  })
  .transform(({ fleetUnitId, fleetEquipmentId, ...rest }) => ({
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
    priceComponent: priceComponentUpdateField,
    isWarranty: z.boolean().optional(),
    ...pcrSupplyFieldsSchema
  })
  .superRefine((data, ctx) => {
    if (data.isWarranty === true) return
    if (data.isWarranty === false) {
      refinePcrSupplyFields(data, ctx, true)

      return
    }
    if (data.pcrSupplyCategory) refinePcrSupplyFields(data, ctx, true)
  })
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required' })

/** Dedicated payload when BA is already submitted but category is still empty. */
export const forecastPcrTypeUpdateSchema = z
  .object(pcrSupplyFieldsSchema)
  .superRefine((data, ctx) => {
    refinePcrSupplyFields(data, ctx, true)
  })

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

export type ForecastPcrTypeUpdateInput = z.infer<typeof forecastPcrTypeUpdateSchema>

export type ForecastGenerateInput = z.infer<typeof forecastGenerateSchema>
