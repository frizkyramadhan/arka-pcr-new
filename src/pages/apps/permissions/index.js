/**
 * Permissions alias route.
 * Redirects legacy MMS path to APMS permissions module.
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
