/**
 * Add breakdown page.
 */
import { useRouter } from 'next/router'

import BreakdownForm from 'src/views/apps/breakdown/BreakdownForm'

const AddBreakdownPage = () => {
  const router = useRouter()

  return (
    <BreakdownForm
      mode='add'
      onSaved={id => router.push(`/breakdowns/view/${id}`)}
      onCancel={() => router.push('/breakdowns')}
    />
  )
}

AddBreakdownPage.acl = {
  subject: 'breakdown',
  action: 'create'
}

export default AddBreakdownPage
