import { resetMeetingsSample } from '@/components/meetings/meetings-store'
import { removeSampleTaskWorkspaces } from '@/components/work/work-task-workspace'
import { resetHomeBoard } from './home-board-store'
import { resetHomeTaskItems } from './home-task-items-host'
import { nextHomeItemGeneration } from './home-task-item-model'

/** "Start over": the whole sample as it first was: the board, the meetings, and the folders its tasks made. */
export function resetSample(): void {
  resetHomeTaskItems()
  nextHomeItemGeneration()
  resetHomeBoard()
  resetMeetingsSample()
  void removeSampleTaskWorkspaces()
}
