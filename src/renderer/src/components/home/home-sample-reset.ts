import { resetMeetingsSample } from '@/components/meetings/meetings-store'
import { removeSampleTaskWorkspaces } from '@/components/work/work-task-workspace'
import { resetHomeBoard } from './home-board-store'

/** "Start over": the whole sample as it first was: the board, the meetings, and the folders its tasks made. */
export function resetSample(): void {
  resetHomeBoard()
  resetMeetingsSample()
  void removeSampleTaskWorkspaces()
}
