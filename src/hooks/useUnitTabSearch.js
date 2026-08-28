/**
 * Debounced search state for unit detail tab panels (server or client filtering).
 */
import { useEffect, useState } from 'react'

const useUnitTabSearch = (delayMs = 300) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim())
    }, delayMs)

    return () => clearTimeout(handle)
  }, [searchInput, delayMs])

  return { searchInput, setSearchInput, search }
}

export default useUnitTabSearch
