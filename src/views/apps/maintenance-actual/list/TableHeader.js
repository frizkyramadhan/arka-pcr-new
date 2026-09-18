/**
 * Toolbar untuk list Maintenance Actual: tombol Add Actual (rata kanan).
 * addHref: jika ada, tombol sebagai Link ke halaman add; jika tidak, pakai onClick toggle (drawer).
 */
import Link from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Icon from 'src/@core/components/icon'

const TableHeader = props => {
  const { toggle, addHref } = props

  const buttonContent = (
    <>
      <Icon fontSize='1.125rem' icon='tabler:plus' />
      Add Actual
    </>
  )

  return (
    <Box
      sx={{
        py: 4,
        px: 6,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}
    >
      {addHref ? (
        <Button component={Link} href={addHref} variant='contained' sx={{ '& svg': { mr: 2 } }}>
          {buttonContent}
        </Button>
      ) : (
        <Button onClick={toggle} variant='contained' sx={{ '& svg': { mr: 2 } }}>
          {buttonContent}
        </Button>
      )}
    </Box>
  )
}

export default TableHeader
