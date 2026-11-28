import React from 'react'
import { WorkSurface } from '@/components/work/WorkPage'

/** Tasks on inAX for someone who works with code: the same board and conversations as Work. */
export function TaskPageInax(): React.JSX.Element {
  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background shadow-sm">
      <WorkSurface />
    </div>
  )
}
