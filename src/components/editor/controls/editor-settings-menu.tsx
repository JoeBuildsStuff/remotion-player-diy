import { useState } from 'react'
import {
  AtSign,
  EllipsisVertical,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'

import { useTheme, type Theme } from '@/components/theme'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const GITHUB_REPO_URL = 'https://github.com/JoeBuildsStuff/remotion-player-diy'

const themes: Array<{ value: Theme; label: string; icon: LucideIcon }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function EditorSettingsMenu() {
  const { theme, setTheme } = useTheme()
  const [projectInfoOpen, setProjectInfoOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Open settings"
              >
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as Theme)}
          >
            {themes.map(({ value, label, icon: ThemeIcon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <ThemeIcon className="h-3.5 w-3.5" />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setProjectInfoOpen(true)}>
            <AtSign className="h-3.5 w-3.5" />
            Project info
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={projectInfoOpen} onOpenChange={setProjectInfoOpen}>
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
                Import media, arrange clips on a timeline, preview edits, and
                use Remotion as the rendering foundation for export workflows.
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
    </>
  )
}
