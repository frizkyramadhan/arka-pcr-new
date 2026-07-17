// ** React Imports
import { useEffect } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'

import { usePageTitle } from 'src/context/PageTitleContext'
import { getReactNodeText } from 'src/utils/react-node-text'

const PageHeader = props => {
  const { title, subtitle } = props
  const { setPageTitle } = usePageTitle()

  useEffect(() => {
    const titleText = getReactNodeText(title).trim()

    if (titleText) setPageTitle(titleText)

    return () => {
      setPageTitle(null)
    }
  }, [title, setPageTitle])

  return (
    <Grid item xs={12}>
      {title}
      {subtitle || null}
    </Grid>
  )
}

export default PageHeader
