/**
 * User list alias route.
 * Redirects legacy MMS path to ARKA PCR users module.
 */
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/users',
      permanent: false
    }
  }
}

export default function UserListAliasPage() {
  return null
}
