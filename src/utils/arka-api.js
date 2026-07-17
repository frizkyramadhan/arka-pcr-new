import axios from 'axios'

import { formatApiError } from 'src/utils/api-error-message'
import { showApiErrorToast } from 'src/utils/api-error-alert'

const arkaApi = axios.create({
  baseURL: '/api/',
  headers: {
    Accept: 'application/json'
  }
})

// axios-mock-adapter (src/@fake-db) replaces the global adapter; on pass-through it
// clears a relative baseURL so requests become /fleet/... instead of /api/fleet/...
/** Next.js trailingSlash — POST tanpa slash akhir → 308, body multipart hilang (Network Error). */
function withTrailingSlash(url) {
  if (!url) return url

  const q = url.indexOf('?')
  if (q === -1) {
    return url.endsWith('/') ? url : `${url}/`
  }

  const pathname = url.slice(0, q)
  const search = url.slice(q)

  return pathname.endsWith('/') ? url : `${pathname}/${search}`
}

arkaApi.interceptors.request.use(config => {
  const path = (config.url ?? '').replace(/^\//, '')
  if (path && !path.startsWith('api/')) {
    config.url = `/api/${path}`
    config.baseURL = ''
  }

  if (config.url) {
    config.url = withTrailingSlash(config.url)
  }

  return config
})

arkaApi.interceptors.response.use(
  response => response,
  error => {
    error.userMessage = formatApiError(error)
    if (!error.config?.skipGlobalErrorToast) {
      showApiErrorToast(error)
    }

    return Promise.reject(error)
  }
)

export default arkaApi
