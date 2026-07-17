import fs from 'fs'
import path from 'path'

import { migrationConfig } from '../config'

const REMAP_FILE = 'commod-id-remap.json'

export type CommodRemap = Record<string, number>

export function commodRemapPath(): string {
  return path.join(path.resolve(migrationConfig.dataDir), REMAP_FILE)
}

export function loadCommodRemap(): CommodRemap {
  const filePath = commodRemapPath()
  if (!fs.existsSync(filePath)) return {}

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as CommodRemap
}

export function resolveModId(idMod: number, remap: CommodRemap): number {
  const key = String(idMod)

  return remap[key] ?? idMod
}

export function saveCommodRemap(remap: CommodRemap): void {
  const filePath = commodRemapPath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(remap, null, 2), 'utf8')
}
