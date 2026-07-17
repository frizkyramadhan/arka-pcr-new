/**
 * Permissions alias route.
 * Redirects legacy MMS path to ARKA PCR permissions module.
 */
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/permissions',
      permanent: false
    }
  }
}

export default function PermissionsAliasPage() {
  return null
}
