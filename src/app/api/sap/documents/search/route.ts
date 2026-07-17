import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { isSapB1Enabled, searchSapDocuments } from '@/lib/sap-b1/client'
import { SapB1DisabledError } from '@/lib/sap-b1/config'
import {
  DOCUMENT_SEARCH_DEFAULT_LIMIT,
  DOCUMENT_SEARCH_MAX_LIMIT,
  normalizeDocNumQuery
} from '@/lib/sap-b1/documents-service'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'
import { requireSession } from '@/lib/utils/api-auth'
import type { SapDocumentType } from '@/types/sap-b1'

const VALID_TYPES = new Set<SapDocumentType>(['wo', 'mr', 'pr', 'po'])
const MIN_QUERY_LENGTH = 4

function parseType(raw: string | null): SapDocumentType | null {
  const type = String(raw ?? '').trim().toLowerCase() as SapDocumentType

  return VALID_TYPES.has(type) ? type : null
}

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  if (!isSapB1Enabled()) {
    return NextResponse.json({ error: 'SAP lookup is currently disabled.', data: [] }, { status: 503 })
  }

  const type = parseType(request.nextUrl.searchParams.get('type'))
  const relatedWo = normalizeDocNumQuery(request.nextUrl.searchParams.get('relatedWo') ?? '')
  const relatedMr = normalizeDocNumQuery(request.nextUrl.searchParams.get('relatedMr') ?? '')
  const query = normalizeDocNumQuery(request.nextUrl.searchParams.get('q') ?? '')
  const limitRaw = Number(request.nextUrl.searchParams.get('limit'))
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), DOCUMENT_SEARCH_MAX_LIMIT)
    : DOCUMENT_SEARCH_DEFAULT_LIMIT

  if (!type) {
    return NextResponse.json({ error: 'Invalid document type. Use WO, MR, PR, or PO.', data: [] }, { status: 400 })
  }

  if (!relatedWo && !relatedMr && query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({
      data: [],
      source: 'sap-b1',
      message: 'Type at least 4 digits to search'
    })
  }

  try {
    const result = await searchSapDocuments({
      type,
      query,
      limit,
      relatedWo: relatedWo || undefined,
      relatedMr: relatedMr || undefined
    })

    return NextResponse.json(result, {
      headers: {
        'X-Sap-Source': 'sap-b1',
        'X-Sap-Enabled': String(isSapB1Enabled())
      }
    })
  } catch (error) {
    if (error instanceof SapB1DisabledError) {
      return NextResponse.json({ error: 'SAP lookup is currently disabled.', data: [] }, { status: 503 })
    }

    return NextResponse.json(
      {
        error: toFriendlySapErrorMessage(error, 'Failed to search SAP documents.'),
        data: []
      },
      { status: 502 }
    )
  }
}
