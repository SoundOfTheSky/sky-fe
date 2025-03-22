import Breadcrumbs from '@/components/breadcrumbs'

import Browser from '../components/browser'

export default function StudyTab() {
  // === Hooks ===
  document.title = 'Sky | Storage'

  return (
    <div class='card-container'>
      <Breadcrumbs />
      <Browser />
    </div>
  )
}
