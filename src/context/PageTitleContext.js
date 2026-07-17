/**
 * Document title from PageHeader; static meta description site-wide.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import Head from 'next/head'

/** Browser tab suffix and meta description (same branding string). */
export const SITE_NAME = 'ARKA Planned Component Replacement'

const PageTitleContext = createContext({
  pageTitle: null,
  setPageTitle: () => null
})

export function PageTitleProvider({ children, fallbackTitle }) {
  const [pageTitle, setPageTitleState] = useState(null)

  const setPageTitle = useCallback(title => {
    setPageTitleState(title?.trim() || null)
  }, [])

  const value = useMemo(
    () => ({
      pageTitle,
      setPageTitle
    }),
    [pageTitle, setPageTitle]
  )

  const pageLabel = pageTitle || fallbackTitle
  const documentTitle = pageLabel ? `${pageLabel} - ${SITE_NAME}` : SITE_NAME

  return (
    <PageTitleContext.Provider value={value}>
      <Head>
        <title key='app-title'>{documentTitle}</title>
        <meta key='app-description' name='description' content={SITE_NAME} />
        <meta key='app-keywords' name='keywords' content='ARKA, PCR, Planned Component Replacement' />
        <meta key='app-viewport' name='viewport' content='initial-scale=1, width=device-width' />
      </Head>
      {children}
    </PageTitleContext.Provider>
  )
}

export function usePageTitle() {
  return useContext(PageTitleContext)
}

export default PageTitleContext
