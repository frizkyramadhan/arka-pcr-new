/**
 * Public exports — notifikasi email ARKA PCR (Nodemailer SMTP).
 */

export {
  notifyApprovalPending,
  notifyApprovalPendingAsync,
  notifyApprovalDecision,
  notifyApprovalDecisionAsync,
  notifyFullyApproved,
  notifyFullyApprovedAsync,
  notifyCannibalHandoff,
  notifyCannibalHandoffAsync,
  notifyCannibalRequestor,
  notifyCannibalRequestorAsync,
  notifyDueOverdue,
  sendTrialEmail,
  buildDetailUrl,
  buildCannibalDetailUrl
} from '@/lib/notifications/events'

export { getMailRuntimeStatus, sendMail, fireAndForget, getAppBaseUrl, verifySmtpConnection } from '@/lib/notifications/mailer'
export { isMailEnabled, setMailEnabled, getMailEnabledStatus } from '@/lib/notifications/mail-enabled'
export { renderTrialEmailPreview, wrapEmailPreviewHtml, parseTrialSampleFromSearchParams } from '@/lib/notifications/preview'
export { NOTIFICATION_EVENTS } from '@/lib/notifications/types'
export type {
  NotificationEvent,
  NotificationPayload,
  TrialSample,
  SendMailResult
} from '@/lib/notifications/types'
