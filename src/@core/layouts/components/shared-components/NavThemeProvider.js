/**
 * NavThemeProvider — dark MUI theme for navigation chrome only (semi-dark mode).
 * Main content stays on the light theme from ThemeComponent.
 */
import { createTheme, responsiveFontSizes, ThemeProvider } from '@mui/material/styles'

import themeConfig from 'src/configs/themeConfig'
import themeOptions from 'src/@core/theme/ThemeOptions'

const NavThemeProvider = ({ settings, children }) => {
  if (settings.mode !== 'semi-dark') {
    return children
  }

  let navTheme = createTheme(themeOptions(settings, 'dark'))

  if (themeConfig.responsiveFontSizes) {
    navTheme = responsiveFontSizes(navTheme)
  }

  return <ThemeProvider theme={navTheme}>{children}</ThemeProvider>
}

export default NavThemeProvider
