/**
 * User detail alias route.
 * Keeps legacy MMS URL shape while routing to users module.
 */
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/users',
      permanent: false
    }
  }
}

export default function UserViewAliasPage() {
  return null
}
