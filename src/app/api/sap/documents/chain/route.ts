import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { buildSapDocumentChain, isSapB1Enabled } from '@/lib/sap-b1/client'
import { SapB1DisabledError } from '@/lib/sap-b1/config'
import { normalizeDocNumQuery } from '@/lib/sap-b1/documents-service'
import { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'
import { requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  if (!isSapB1Enabled()) {
    return NextResponse.json({ error: 'SAP lookup is currently disabled.', data: null }, { status: 503 })
  }

  const woNo = normalizeDocNumQuery(request.nextUrl.searchParams.get('woNo') ?? '')
  const woRemoveNo = normalizeDocNumQuery(request.nextUrl.searchParams.get('woRemoveNo') ?? '')
  const woInstallNo = normalizeDocNumQuery(request.nextUrl.searchParams.get('woInstallNo') ?? '')
  const mrNo = normalizeDocNumQuery(request.nextUrl.searchParams.get('mrNo') ?? '')
  const prNo = normalizeDocNumQuery(request.nextUrl.searchParams.get('prNo') ?? '')
  const poNo = normalizeDocNumQuery(request.nextUrl.searchParams.get('poNo') ?? '')

  if (!woNo && !woRemoveNo && !woInstallNo && !mrNo && !prNo && !poNo) {
    return NextResponse.json(
      { error: 'Provide at least one document number to build the chain.', data: null },
      { status: 400 }
    )
  }

  try {
    const data = await buildSapDocumentChain({
      woNo: woNo || null,
      woRemoveNo: woRemoveNo || null,
      woInstallNo: woInstallNo || null,
      mrNo: mrNo || null,
      prNo: prNo || null,
      poNo: poNo || null
    })

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
        error: toFriendlySapErrorMessage(error, 'Failed to load SAP document chain.'),
        data: null
      },
      { status: 502 }
    )
  }
}
