/**
 * Nodemailer mailer — kirim email via SMTP.
 * Fail-soft: error di-log, jangan throw ke approval flow.
 */

import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

import { getMailEnabledStatus, isMailEnabled } from '@/lib/notifications/mail-enabled'
import type { SendMailResult } from '@/lib/notifications/types'

export type SendMailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  /** Dipakai untuk dedupe di notification_log (bukan header SMTP). */
  idempotencyKey?: string
  tags?: Array<{ name: string; value: string }>
}

function isTruthyEnv(value: string | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === 'true'
}

export function getMailFrom(): string {
  return (process.env.MAIL_FROM ?? 'ARKA PCR <noreply@arka.local>').trim()
}

export function getAppBaseUrl(): string {
  const base = (process.env.AUTH_URL ?? 'http://localhost:3000').trim().replace(/\/$/, '')

  return base || 'http://localhost:3000'
}

export function getSmtpConfig() {
  const host = (process.env.SMTP_HOST ?? '').trim()
  const portRaw = (process.env.SMTP_PORT ?? '587').trim()
  const port = Number.parseInt(portRaw, 10)

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: isTruthyEnv(process.env.SMTP_SECURE),
    user: (process.env.SMTP_USER ?? '').trim(),
    pass: process.env.SMTP_PASS ?? ''
  }
}

export function getMailRuntimeStatus() {
  const smtp = getSmtpConfig()

  return {
    ...getMailEnabledStatus(),
    smtpConfigured: Boolean(smtp.host),
    smtpHost: smtp.host || null,
    smtpPort: smtp.port,
    smtpSecure: smtp.secure,
    smtpAuth: Boolean(smtp.user),
    mailFrom: getMailFrom(),
    appBaseUrl: getAppBaseUrl(),
    /** Next.js: .env.local overrides .env for the same key. */
    envHint: 'Values from process.env (.env.local overrides .env)'
  }
}

/** Ping SMTP server (verify transport). */
export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  const transport = getTransporter()
  if (!transport) {
    return { ok: false, error: 'SMTP_HOST not configured' }
  }

  try {
    await transport.verify()

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMTP verify failed'

    return { ok: false, error: message }
  }
}

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null
let transporterKey: string | null = null

function getTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null {
  const smtp = getSmtpConfig()
  if (!smtp.host) return null

  const key = `${smtp.host}:${smtp.port}:${smtp.secure}:${smtp.user}`
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined
    })
    transporterKey = key
  }

  return transporter
}

/** Kirim satu email. Return skip/fail tanpa throw. */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (!isMailEnabled()) {
    return { ok: true, id: null, skipped: true, reason: 'MAIL_ENABLED=false' }
  }

  const transport = getTransporter()
  if (!transport) {
    console.warn('[notifications] SMTP_HOST not set — email skipped')

    return { ok: true, id: null, skipped: true, reason: 'SMTP_HOST missing' }
  }

  const to = Array.isArray(input.to) ? input.to : [input.to]
  const recipients = to.map(addr => addr.trim()).filter(Boolean)

  if (recipients.length === 0) {
    return { ok: true, id: null, skipped: true, reason: 'no recipients' }
  }

  try {
    const info = await transport.sendMail({
      from: getMailFrom(),
      to: recipients.join(', '),
      subject: input.subject,
      html: input.html,
      text: input.text
    })

    return { ok: true, id: info.messageId ?? null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMTP error sending email'
    console.error('[notifications] SMTP failure:', message)

    return { ok: false, error: { message, name: err instanceof Error ? err.name : 'SMTPError' } }
  }
}

/** Jalankan promise notifikasi tanpa memblokir / menggagalkan caller. */
export function fireAndForget(task: Promise<unknown>, label = 'notify'): void {
  void task.catch(error => {
    console.error(`[notifications] ${label} failed:`, error instanceof Error ? error.message : error)
  })
}
