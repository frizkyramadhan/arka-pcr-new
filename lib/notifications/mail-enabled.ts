/**
 * Runtime toggle MAIL_ENABLED — admin on/off, persist ke file.
 * Jika belum di-override, fallback ke env MAIL_ENABLED.
 */

import fs from 'fs'
import path from 'path'

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'runtime-settings.json')

type RuntimeSettings = {
  mailEnabled?: boolean
}

function parseMailEnabledEnv(value: string | undefined): boolean {
  const flag = (value ?? 'true').trim().toLowerCase()

  return flag !== 'false' && flag !== '0' && flag !== 'off'
}

export function getMailEnabledFromEnv(): boolean {
  return parseMailEnabledEnv(process.env.MAIL_ENABLED)
}

function readSettings(): RuntimeSettings {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8')
    const parsed = JSON.parse(raw) as RuntimeSettings

    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeSettings(next: RuntimeSettings): void {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })
  fs.writeFileSync(SETTINGS_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}

/** True jika email boleh dikirim (runtime override > env). */
export function isMailEnabled(): boolean {
  const settings = readSettings()
  if (typeof settings.mailEnabled === 'boolean') return settings.mailEnabled

  return getMailEnabledFromEnv()
}

export function getMailEnabledStatus() {
  const settings = readSettings()
  const envDefault = getMailEnabledFromEnv()
  const hasOverride = typeof settings.mailEnabled === 'boolean'

  return {
    mailEnabled: hasOverride ? settings.mailEnabled! : envDefault,
    mailEnabledSource: (hasOverride ? 'runtime' : 'env') as 'runtime' | 'env',
    mailEnabledEnvDefault: envDefault
  }
}

/** Simpan override admin. Return status terbaru. */
export function setMailEnabled(enabled: boolean) {
  const previous = isMailEnabled()
  const current = readSettings()
  writeSettings({ ...current, mailEnabled: enabled })

  return {
    ...getMailEnabledStatus(),
    previousMailEnabled: previous
  }
}
