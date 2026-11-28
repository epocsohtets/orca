import { setTaskStatus, useMeetings } from '@/components/meetings/meetings-store'
import { useHomeBoardStore } from './home-board-store'

// A follow-up task is one task: what I confirm onto inAX is the status its meeting's minutes show.
useHomeBoardStore.subscribe((state) => {
  for (const task of useMeetings.getState().tasks) {
    const status = state.inax[task.id]?.status
    // The minutes have three states; "in review" is still in progress there.
    const next = status === 'review' ? 'inProgress' : status
    if (next && next !== task.status) {
      setTaskStatus(task.id, next)
    }
  }
})
