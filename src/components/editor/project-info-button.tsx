import { useState } from 'react'
import { Code2, ExternalLink, AtSign } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const GITHUB_REPO_URL = 'https://github.com/JoeBuildsStuff/remotion-player-diy'

export function ProjectInfoButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Project information"
            onClick={() => setIsOpen(true)}
            className="h-7 w-7"
          >
            <AtSign className="h-4 w-4" />       
          </Button>
        </TooltipTrigger>
        <TooltipContent>Project information</TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remotion Player DIY</DialogTitle>
          <DialogDescription>
            A browser-based video editor prototype built with React, Vite,
            Remotion Player, and shared editor UI primitives.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-md border border-border bg-secondary p-3">
            <div className="text-xs font-medium text-foreground">
              Project mockup
            </div>
            <p className="mt-1 text-xs/relaxed text-muted-foreground">
              Import media, arrange clips on a timeline, preview edits, and use
              Remotion as the rendering foundation for export workflows.
            </p>
          </div>

          <div className="grid gap-2 text-xs/relaxed text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Status:</span>{' '}
              early editor prototype
            </div>
            <div>
              <span className="font-medium text-foreground">Stack:</span>{' '}
              React, TypeScript, Vite, Remotion, Tailwind CSS
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" asChild>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
