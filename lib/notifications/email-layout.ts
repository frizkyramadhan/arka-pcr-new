/**
 * Layout HTML email ARKA PCR — table-based, inline CSS, Outlook + Thunderbird safe.
 */

export type EmailTheme = {
  accent: string
  accentLight: string
  badgeBg: string
  badgeText: string
  badgeLabel: string
}

export const EMAIL_THEMES: Record<string, EmailTheme> = {
  pending: {
    accent: '#d97706',
    accentLight: '#fffbeb',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    badgeLabel: 'Menunggu approval'
  },
  approved: {
    accent: '#059669',
    accentLight: '#ecfdf5',
    badgeBg: '#d1fae5',
    badgeText: '#065f46',
    badgeLabel: 'Disetujui'
  },
  rejected: {
    accent: '#dc2626',
    accentLight: '#fef2f2',
    badgeBg: '#fee2e2',
    badgeText: '#991b1b',
    badgeLabel: 'Ditolak'
  },
  revoked: {
    accent: '#7c3aed',
    accentLight: '#f5f3ff',
    badgeBg: '#ede9fe',
    badgeText: '#5b21b6',
    badgeLabel: 'Dicabut'
  },
  complete: {
    accent: '#0284c7',
    accentLight: '#f0f9ff',
    badgeBg: '#e0f2fe',
    badgeText: '#075985',
    badgeLabel: 'Fully approved'
  },
  handoff: {
    accent: '#4f46e5',
    accentLight: '#eef2ff',
    badgeBg: '#e0e7ff',
    badgeText: '#3730a3',
    badgeLabel: 'Handoff'
  },
  due: {
    accent: '#ea580c',
    accentLight: '#fff7ed',
    badgeBg: '#ffedd5',
    badgeText: '#9a3412',
    badgeLabel: 'Due / critical'
  },
  overdue: {
    accent: '#b91c1c',
    accentLight: '#fef2f2',
    badgeBg: '#fecaca',
    badgeText: '#7f1d1d',
    badgeLabel: 'Overdue'
  },
  ping: {
    accent: '#64748b',
    accentLight: '#f8fafc',
    badgeBg: '#e2e8f0',
    badgeText: '#334155',
    badgeLabel: 'System'
  }
}

const EMAIL_WIDTH = 600
const FONT_STACK = 'Segoe UI, Arial, Helvetica, sans-serif'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emailHead(): string {
  return `<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    a { color: #0284c7; }
  </style>
</head>`
}

/** Badge status — table cell (Outlook/Thunderbird safe, no border-radius dependency). */
export function statusBadge(label: string, bg: string, color: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" align="left" style="margin:0 0 4px 0">
    <tr>
      <td bgcolor="${bg}" style="background-color:${bg};color:${color};font-family:${FONT_STACK};font-size:10px;font-weight:bold;padding:4px 8px;text-transform:uppercase;mso-line-height-rule:exactly;line-height:14px;">
        ${escapeHtml(label)}
      </td>
    </tr>
  </table>`
}

/** Bulletproof CTA — VML fallback for Outlook, table anchor for Thunderbird/modern clients. */
function bulletproofButton(url: string, label: string, bgColor: string): string {
  const safeUrl = escapeHtml(url)
  const safeLabel = escapeHtml(label)

  return `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="10%" stroke="f" fillcolor="${bgColor}">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:${FONT_STACK};font-size:14px;font-weight:bold;">${safeLabel}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:28px 0 8px">
  <tr>
    <td align="center" bgcolor="${bgColor}" style="background-color:${bgColor};border-radius:6px;">
      <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:${FONT_STACK};font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;mso-line-height-rule:exactly;line-height:20px;">${safeLabel}</a>
    </td>
  </tr>
</table>
<!--<![endif]-->`
}

export function emailShell(options: {
  theme: EmailTheme
  headline: string
  subheadline?: string
  bodyHtml: string
  ctaUrl?: string
  ctaLabel?: string
  footerNote?: string
}): string {
  const { theme, headline, subheadline, bodyHtml, ctaUrl, ctaLabel = 'Buka di ARKA PCR', footerNote } = options
  const button = ctaUrl ? bulletproofButton(ctaUrl, ctaLabel, theme.accent) : ''

  const sub = subheadline
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr>
          <td style="padding-top:8px;font-family:${FONT_STACK};font-size:14px;line-height:21px;color:#64748b;mso-line-height-rule:exactly;">
            ${escapeHtml(subheadline)}
          </td>
        </tr>
      </table>`
    : ''

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="id">
${emailHead()}
<body style="margin:0;padding:0;width:100%;background-color:#f1f5f9;font-family:${FONT_STACK};color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#f1f5f9" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table width="${EMAIL_WIDTH}" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#ffffff" style="width:${EMAIL_WIDTH}px;max-width:${EMAIL_WIDTH}px;background-color:#ffffff;border:1px solid #e2e8f0;">
          <tr>
            <td bgcolor="${theme.accent}" style="background-color:${theme.accent};height:4px;font-size:0;line-height:4px;mso-line-height-rule:exactly;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:20px 24px 16px;border-bottom:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td valign="middle" style="font-family:${FONT_STACK};vertical-align:middle;">
                    <p style="margin:0;font-size:20px;font-weight:bold;line-height:24px;color:#0f172a;mso-line-height-rule:exactly;">ARKA PCR</p>
                    <p style="margin:4px 0 0;font-size:12px;line-height:16px;color:#64748b;mso-line-height-rule:exactly;">Planned Component Replacement</p>
                  </td>
                  <td align="right" valign="middle" style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation" align="right">
                      <tr>
                        <td bgcolor="${theme.badgeBg}" style="background-color:${theme.badgeBg};color:${theme.badgeText};font-family:${FONT_STACK};font-size:11px;font-weight:bold;padding:6px 10px;text-transform:uppercase;mso-line-height-rule:exactly;line-height:14px;">
                          ${escapeHtml(theme.badgeLabel)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-family:${FONT_STACK};">
              <p style="margin:0;font-size:22px;font-weight:bold;line-height:28px;color:#0f172a;mso-line-height-rule:exactly;">${escapeHtml(headline)}</p>
              ${sub}
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="padding-top:20px;font-family:${FONT_STACK};">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
              ${button}
              <p style="margin:24px 0 0;font-family:${FONT_STACK};font-size:12px;line-height:18px;color:#94a3b8;mso-line-height-rule:exactly;">
                ${escapeHtml(footerNote ?? 'Pesan otomatis dari ARKA PCR. Mohon tidak membalas email ini.')}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function infoGrid(items: Array<{ label: string; value: string | null | undefined }>): string {
  const filtered = items.filter(item => item.value != null && String(item.value).trim() !== '')
  if (filtered.length === 0) return ''

  let rows = ''
  for (let i = 0; i < filtered.length; i += 2) {
    const left = filtered[i]
    const right = filtered[i + 1]
    rows += `<tr>
      <td width="50%" valign="top" style="width:50%;padding:0 6px 12px 0;vertical-align:top;">${infoCell(left.label, String(left.value))}</td>
      <td width="50%" valign="top" style="width:50%;padding:0 0 12px 6px;vertical-align:top;">${right ? infoCell(right.label, String(right.value)) : '&nbsp;'}</td>
    </tr>`
  }

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">${rows}</table>`
}

function infoCell(label: string, value: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#f8fafc" style="background-color:#f8fafc;border:1px solid #e2e8f0;">
    <tr>
      <td style="padding:12px 14px;font-family:${FONT_STACK};">
        <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#64748b;text-transform:uppercase;mso-line-height-rule:exactly;line-height:14px;">${escapeHtml(label)}</p>
        <p style="margin:0;font-size:14px;font-weight:bold;color:#0f172a;mso-line-height-rule:exactly;line-height:20px;">${escapeHtml(value)}</p>
      </td>
    </tr>
  </table>`
}

export function remarkBox(text: string | null | undefined): string {
  if (!text?.trim()) return ''

  const theme = EMAIL_THEMES.pending

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:16px;">
    <tr>
      <td width="4" bgcolor="${theme.accent}" style="width:4px;background-color:${theme.accent};font-size:0;line-height:0;">&nbsp;</td>
      <td bgcolor="${theme.accentLight}" style="background-color:${theme.accentLight};padding:14px 16px;font-family:${FONT_STACK};">
        <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#92400e;mso-line-height-rule:exactly;line-height:14px;">Catatan</p>
        <p style="margin:0;font-size:14px;color:#78350f;mso-line-height-rule:exactly;line-height:21px;">${escapeHtml(text.trim())}</p>
      </td>
    </tr>
  </table>`
}

export function lifeBar(percent: number): string {
  const clamped = Math.min(Math.max(percent, 0), 150)
  const filled = Math.min(Math.round(clamped), 100)
  const empty = 100 - filled
  const color = percent >= 100 ? '#dc2626' : percent >= 85 ? '#ea580c' : '#059669'

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:6px;">
    <tr>
      <td width="${filled}%" bgcolor="${color}" style="width:${filled}%;background-color:${color};height:6px;font-size:0;line-height:6px;mso-line-height-rule:exactly;">&nbsp;</td>
      <td width="${empty}%" bgcolor="#e2e8f0" style="width:${empty}%;background-color:#e2e8f0;height:6px;font-size:0;line-height:6px;mso-line-height-rule:exactly;">&nbsp;</td>
    </tr>
    <tr>
      <td colspan="2" style="padding-top:4px;font-family:${FONT_STACK};font-size:12px;line-height:16px;color:#64748b;mso-line-height-rule:exactly;">
        ${percent.toFixed(1)}% life
      </td>
    </tr>
  </table>`
}

export function dataTable(headers: string[], rows: string[][]): string {
  const head = headers
    .map(
      h =>
        `<th align="left" bgcolor="#f8fafc" style="padding:10px 12px;font-family:${FONT_STACK};font-size:11px;font-weight:bold;color:#64748b;text-transform:uppercase;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;mso-line-height-rule:exactly;line-height:14px;">${escapeHtml(h)}</th>`
    )
    .join('')

  const body = rows
    .map((row, idx) => {
      const bg = idx % 2 ? '#fafafa' : '#ffffff'

      return `<tr bgcolor="${bg}" style="background-color:${bg};">${row
        .map(
          cell =>
            `<td valign="top" style="padding:10px 12px;font-family:${FONT_STACK};font-size:13px;line-height:18px;color:#334155;border-bottom:1px solid #f1f5f9;vertical-align:top;mso-line-height-rule:exactly;">${cell}</td>`
        )
        .join('')}</tr>`
    })
    .join('')

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:8px;border:1px solid #e2e8f0;">
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>`
}

export function textFromRows(title: string, rows: Array<[string, string | null | undefined]>, url?: string): string {
  const lines = [`ARKA PCR — ${title}`, '']
  for (const [label, value] of rows) {
    if (value != null && String(value).trim() !== '') lines.push(`${label}: ${value}`)
  }
  if (url) lines.push('', `Buka: ${url}`)

  return lines.join('\n')
}
