/**
 * Unit list alias route.
 * Redirects legacy MMS path to ARKA PCR equipment list.
 */
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/units',
      permanent: false
    }
  }
}

export default function UnitListAliasPage() {
  return null
}
