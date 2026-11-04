/**
 * User list alias route.
 * Redirects legacy MMS path to APMS users module.
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
