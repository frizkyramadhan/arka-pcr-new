/**
 * Clickable SAP document chip — opens detail drawer on click.
 */
import { useState } from 'react'

import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'

import SapDocumentDetailDrawer from './SapDocumentDetailDrawer'
import { hasDocNumValue, normalizeDocNumValue, formatDocNumLabel } from './sap-document-utils'

const SapDocumentBadge = ({ type, docNum, label, disabled = false, readOnly = false, onClick, size = 'small' }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const normalized = normalizeDocNumValue(docNum)
  const opensDrawer = !readOnly && !onClick

  if (!hasDocNumValue(normalized)) {
    return (
      <Typography variant='body2' sx={{ color: 'text.disabled' }}>
        —
      </Typography>
    )
  }

  if (disabled) {
    return (
      <Typography variant='body2' sx={{ fontWeight: 600 }}>
        {label || formatDocNumLabel(type, normalized)}
      </Typography>
    )
  }

  const handleClick = event => {
    event?.stopPropagation?.()
    if (onClick) {
      onClick()
      return
    }
    if (opensDrawer) setDrawerOpen(true)
  }

  return (
    <>
      <CustomChip
        rounded
        skin='light'
        size={size}
        color='info'
        label={label || formatDocNumLabel(type, normalized)}
        onClick={readOnly ? undefined : handleClick}
        sx={{
          maxWidth: '100%',
          ...(readOnly ? { cursor: 'default', pointerEvents: 'none' } : { cursor: 'pointer' })
        }}
        icon={<Icon icon='tabler:database' fontSize='0.85rem' />}
      />
      {opensDrawer ? (
        <SapDocumentDetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} type={type} docNum={normalized} />
      ) : null}
    </>
  )
}

export default SapDocumentBadge
