import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getSapDocumentWithRelations, isSapB1Enabled } from '@/lib/sap-b1/client'
import { SapB1DisabledError } from '@/lib/sap-b1/config'
import { normalizeDocNumQuery } from '@/lib/sap-b1/documents-service'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'
import { requireSession } from '@/lib/utils/api-auth'
import type { SapDocumentType } from '@/types/sap-b1'

const VALID_TYPES = new Set<SapDocumentType>(['wo', 'mr', 'pr', 'po', 'mi'])

function parseType(raw: string | null): SapDocumentType | null {
  const type = String(raw ?? '').trim().toLowerCase() as SapDocumentType

  return VALID_TYPES.has(type) ? type : null
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  if (!isSapB1Enabled()) {
    return NextResponse.json({ error: 'SAP lookup is currently disabled.', data: null }, { status: 503 })
  }

  const type = parseType(request.nextUrl.searchParams.get('type'))
  const docNumRaw = normalizeDocNumQuery(request.nextUrl.searchParams.get('docNum') ?? '')
  const docNum = Number(docNumRaw)

  if (!type) {
    return NextResponse.json(
      { error: 'Invalid document type. Use WO, MR, PR, PO, or MI.', data: null },
      { status: 400 }
    )
  }

  if (!Number.isFinite(docNum) || docNum <= 0) {
    return NextResponse.json({ error: 'Invalid document number.', data: null }, { status: 400 })
  }

  try {
    const data = await getSapDocumentWithRelations(type, docNum)

    if (!data) {
      return NextResponse.json({ error: 'Document not found in SAP.', data: null }, { status: 404 })
    }

    return NextResponse.json(
      { data, source: 'sap-b1' },
      {
        headers: {
          'X-Sap-Source': 'sap-b1',
          'X-Sap-Enabled': String(isSapB1Enabled())
        }
      }
    )
  } catch (error) {
    if (error instanceof SapB1DisabledError) {
      return NextResponse.json({ error: 'SAP lookup is currently disabled.', data: null }, { status: 503 })
    }

    return NextResponse.json(
      {
        error: toFriendlySapErrorMessage(error, 'Failed to load SAP document.'),
        data: null
      },
      { status: 502 }
    )
  }
}
