/**
 * Pilih banyak role lewat kartu klik — alternatif dari daftar checkbox.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'

const permissionCount = role => (role.permissions ?? []).filter(Boolean).length

const UserRolePicker = ({ roles, value, onChange, error }) => {
  const selectedSet = new Set(value ?? [])

  const toggleRole = idRole => {
    const next = new Set(selectedSet)
    if (next.has(idRole)) next.delete(idRole)
    else next.add(idRole)
    onChange(Array.from(next))
  }

  const handleKeyDown = (event, idRole) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleRole(idRole)
    }
  }

  if (!roles.length) {
    return (
      <Typography variant='body2' color='text.secondary'>
        No active roles available
      </Typography>
    )
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
          maxHeight: 320,
          overflowY: 'auto',
          pr: 0.5
        }}
      >
        {roles.map(role => {
          const selected = selectedSet.has(role.idRole)
          const count = permissionCount(role)

          return (
            <Card
              key={role.idRole}
              variant='outlined'
              role='button'
              tabIndex={0}
              onClick={() => toggleRole(role.idRole)}
              onKeyDown={event => handleKeyDown(event, role.idRole)}
              sx={{
                p: 3,
                cursor: 'pointer',
                borderWidth: 2,
                borderStyle: 'solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? theme => `${theme.palette.primary.main}14` : 'background.paper',
                transition: theme =>
                  theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
                    duration: theme.transitions.duration.shorter
                  }),
                '&:hover': {
                  borderColor: selected ? 'primary.main' : 'text.disabled',
                  boxShadow: 2
                },
                '&:focus-visible': {
                  outline: theme => `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='subtitle2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {role.name}
                  </Typography>
                  {role.description ? (
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                      {role.description}
                    </Typography>
                  ) : null}
                </Box>
                {selected ? (
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText'
                    }}
                  >
                    <Icon icon='tabler:check' fontSize='1rem' />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: theme => `2px solid ${theme.palette.divider}`
                    }}
                  />
                )}
              </Box>
              {count > 0 ? (
                <Box sx={{ mt: 2 }}>
                  <CustomChip skin='light' size='small' color={selected ? 'primary' : 'secondary'} label={`${count} permissions`} />
                </Box>
              ) : null}
            </Card>
          )
        })}
      </Box>
      {error ? (
        <Typography variant='caption' color='error' sx={{ mt: 1.5, display: 'block' }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  )
}

export default UserRolePicker
