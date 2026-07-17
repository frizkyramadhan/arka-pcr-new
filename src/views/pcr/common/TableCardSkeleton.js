// ** MUI Imports
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

const TableCardSkeleton = ({ rows = 8, showToolbar = true }) => (
  <Box sx={{ px: 6, py: 4 }}>
    {showToolbar && (
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Skeleton variant='rounded' width={120} height={38} />
        <Skeleton variant='rounded' width={160} height={38} />
        <Skeleton variant='rounded' width={200} height={38} />
      </Box>
    )}
    <Skeleton variant='rounded' height={42} sx={{ mb: 1 }} />
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} variant='rounded' height={52} sx={{ mb: 1 }} />
    ))}
  </Box>
)

export default TableCardSkeleton
