/**
 * Roles alias route.
 * Redirects legacy MMS path to APMS roles module.
 */
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/roles',
      permanent: false
    }
  }
}

export default function RolesAliasPage() {
  return null
}
