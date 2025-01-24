import { createEffect } from 'solid-js'

import syncStore, { SYNC_STATUS } from '@/services/sync.store'


export default function StudyTab() {
  // === Hooks ===
  document.title = 'Sky | Study'

  const {
    updateStats,
    now,
    update,
  } = useStudy()!

  // Update stats when synched
  createEffect(() => {
    if (syncStore.status() === SYNC_STATUS.SYNCHED) void updateStats()
  })

  // Update every hour
  createEffect(() => {
    now()
    void update()
  })

  return (
    <div class="card-container">
      <Themes />
      <StartReviewSession lessons />
      <StartReviewSession />
      <StudyActivity />
      <StudyReviewForecast />
      <StudyStats />
    </div>
  )
}
