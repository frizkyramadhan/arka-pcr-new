/**
 * Unit detail alias route.
 * Redirects legacy MMS path to ARKA PCR equipment detail.
 */
export async function getServerSideProps(context) {
  const { id } = context.params ?? {}

  return {
    redirect: {
      destination: `/units/${id}`,
      permanent: false
    }
  }
}

export default function UnitViewAliasPage() {
  return null
}
