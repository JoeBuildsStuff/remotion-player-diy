import { TooltipProvider } from '@/components/ui/tooltip'

import { EditorProvider } from './model/editor-context'
import { EditorShell } from './shell/editor-shell'
import type { Project } from '../../../shared/project-schema'

export function Editor({
  projectId,
  initialProject,
}: {
  projectId?: string
  initialProject?: Project
}) {
  return (
    <EditorProvider projectId={projectId} initialProject={initialProject}>
      <TooltipProvider>
        <EditorShell />
      </TooltipProvider>
    </EditorProvider>
  )
}
