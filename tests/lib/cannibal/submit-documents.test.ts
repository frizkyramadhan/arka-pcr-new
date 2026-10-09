/**
 * Submit for Approval checks saved MR, PR, WO, and notes.
 * The documentation-complete checkbox is not part of the gate.
 */
import { describe, expect, it } from 'vitest'

import { cannibalSubmitDocumentError, isExecutionComplete } from '@/lib/cannibal/workflow'

const complete = {
  mrNo: '265070709',
  prNo: '260170624',
  executionNotes: 'Menambah populasi unit drilling',
  pairs: [{ remove: { woNoKanibal: '265171340' }, install: { woNoKanibal: '265171340' } }]
}

describe('cannibalSubmitDocumentError', () => {
  it('passes when MR, PR, both WO numbers, and notes are saved', () => {
    expect(cannibalSubmitDocumentError(complete)).toBeNull()
  })

  it('lists every missing document instead of a checkbox', () => {
    expect(
      cannibalSubmitDocumentError({
        mrNo: '',
        prNo: '260170624',
        executionNotes: '',
        documentationComplete: true,
        pairs: [{ remove: { woNoKanibal: '' }, install: { woNoKanibal: '265171340' } }]
      })
    ).toBe('MR#, WO REMOVE, and documentation notes are required before submit for approval')
  })

  it('does not treat the old documentation-complete flag as enough', () => {
    expect(isExecutionComplete({ documentationComplete: true, executionNotes: 'catatan', pairs: [] })).toBe(false)
    expect(
      isExecutionComplete({
        executionNotes: 'catatan',
        pairs: [{ remove: { woNoKanibal: '1' }, install: { woNoKanibal: '2' } }]
      })
    ).toBe(true)
  })
})
