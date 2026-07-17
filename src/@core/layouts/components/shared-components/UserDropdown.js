/**
 * App bar user menu — logged-in user avatar, change password, and sign out.
 */
import { useState, Fragment } from 'react'

import Box from '@mui/material/Box'
import Menu from '@mui/material/Menu'
import Badge from '@mui/material/Badge'
import Divider from '@mui/material/Divider'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'

import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'
import ChangePasswordDialog from 'src/@core/components/change-password-dialog'
import { getInitials } from 'src/@core/utils/get-initials'
import { formatRoleName } from '@/lib/rbac/role-display'

import { useAuth } from 'src/hooks/useAuth'

const BadgeContentSpan = styled('span')(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: theme.palette.success.main,
  boxShadow: `0 0 0 2px ${theme.palette.background.paper}`
}))

const onlineBadgeProps = {
  overlap: 'circular',
  badgeContent: <BadgeContentSpan />,
  anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
}

const MenuItemStyled = styled(MenuItem)(({ theme }) => ({
  '&:hover .MuiBox-root, &:hover .MuiBox-root svg': {
    color: theme.palette.primary.main
  }
}))

const UserDropdown = props => {
  const { settings } = props

  const [anchorEl, setAnchorEl] = useState(null)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  const { user, logout } = useAuth()

  const { direction } = settings
  const displayName = user?.fullName?.trim() || 'User'
  const initials = getInitials(displayName)
  const roleLabel = (user?.roles ?? []).map(formatRoleName).join(', ')

  const handleDropdownOpen = event => {
    setAnchorEl(event.currentTarget)
  }

  const handleDropdownClose = () => {
    setAnchorEl(null)
  }

  const handleOpenChangePassword = () => {
    handleDropdownClose()
    setChangePasswordOpen(true)
  }

  const handleLogout = () => {
    handleDropdownClose()
    logout()
  }

  const menuItemStyles = {
    px: 4,
    py: 1.75,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    color: 'text.primary',
    '& svg': {
      mr: 2.5,
      fontSize: '1.5rem',
      color: 'text.secondary'
    }
  }

  const avatarSx = {
    width: 38,
    height: 38,
    fontWeight: 500,
    fontSize: theme => theme.typography.body1.fontSize
  }

  return (
    <Fragment>
      <Badge
        {...onlineBadgeProps}
        onClick={handleDropdownOpen}
        sx={{ ml: 2, cursor: 'pointer' }}
      >
        <CustomAvatar skin='light' color='primary' onClick={handleDropdownOpen} sx={{ ...avatarSx }}>
          {initials}
        </CustomAvatar>
      </Badge>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleDropdownClose}
        sx={{ '& .MuiMenu-paper': { width: 260, mt: 4.75 } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: direction === 'ltr' ? 'right' : 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: direction === 'ltr' ? 'right' : 'left' }}
      >
        <Box sx={{ py: 1.75, px: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Badge {...onlineBadgeProps}>
              <CustomAvatar skin='light' color='primary' sx={{ width: '2.5rem', height: '2.5rem' }}>
                {initials}
              </CustomAvatar>
            </Badge>
            <Box sx={{ ml: 2.5, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 500, lineHeight: 1.3 }} noWrap>
                {displayName}
              </Typography>
              {roleLabel ? (
                <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.3 }} noWrap>
                  Role: {roleLabel}
                </Typography>
              ) : null}
            </Box>
          </Box>
        </Box>
        <Divider sx={{ my: theme => `${theme.spacing(2)} !important` }} />
        <MenuItemStyled sx={{ p: 0 }} onClick={handleOpenChangePassword}>
          <Box sx={menuItemStyles}>
            <Icon icon='tabler:lock' />
            Change Password
          </Box>
        </MenuItemStyled>
        <MenuItemStyled sx={{ p: 0 }} onClick={handleLogout}>
          <Box sx={menuItemStyles}>
            <Icon icon='tabler:logout' />
            Sign Out
          </Box>
        </MenuItemStyled>
      </Menu>
      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </Fragment>
  )
}

export default UserDropdown
