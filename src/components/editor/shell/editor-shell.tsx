import { Inspector } from '../inspector/inspector'
import { Preview } from '../preview/preview'
import { Timeline } from '../timeline/timeline'
import { Toolbar } from '../toolbar/toolbar'
import { TransportBar } from '../transport/transport-bar'

export function EditorShell() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Preview />
        <Inspector />
      </div>

      <TransportBar />
      <Timeline />
    </div>
  )
}
