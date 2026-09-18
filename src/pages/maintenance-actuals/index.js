/**
 * Redirect /maintenance-actuals → list.
 */
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/maintenance-actuals/list',
      permanent: false
    }
  }
}

export default function MaintenanceActualsIndex() {
  return null
}
