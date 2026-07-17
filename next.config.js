/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')

/** @type {import('next').NextConfig} */

// Remove this if you're not using Fullcalendar features

module.exports = {
  trailingSlash: true,
  reactStrictMode: false,
  experimental: {
    instrumentationHook: true,
    appDir: true
  },
  async redirects() {
    return [
      { source: '/cannibal', destination: '/cannibals', permanent: true },
      { source: '/cannibal/:path*', destination: '/cannibals/:path*', permanent: true },
      { source: '/cannibal-approvals', destination: '/cannibals-approvals', permanent: true },
      { source: '/cannibal-approvals/:path*', destination: '/cannibals-approvals/:path*', permanent: true },
      { source: '/api/cannibal', destination: '/api/cannibals', permanent: true },
      { source: '/api/cannibal/:path*', destination: '/api/cannibals/:path*', permanent: true },
      { source: '/api/exports/cannibal', destination: '/api/exports/cannibals', permanent: true },
      { source: '/api/exports/cannibal/:path*', destination: '/api/exports/cannibals/:path*', permanent: true }
    ]
  },
  webpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      apexcharts: path.resolve(__dirname, './node_modules/apexcharts-clevision')
    }

    return config
  }
}
