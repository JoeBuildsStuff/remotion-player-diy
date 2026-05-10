import { useState } from 'react'
import {
  AtSign,
  ExternalLink,
  EllipsisVertical,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'

import { buildInfo } from '@/lib/build-info'
import { useTheme, type Theme } from '@/components/theme'
import { Badge } from '@/components/ui/badge'
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
const GITHUB_COMMIT_URL = `${GITHUB_REPO_URL}/commit/${buildInfo.commitSha}`

function formatBuildTime(value: string) {
  if (!value) return 'unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const buildTimeLabel = formatBuildTime(buildInfo.buildTime)

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
                variant="secondary"
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

            <div className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-medium text-foreground">
                  Build
                </div>
                <Badge variant="secondary">{buildInfo.releaseVersion}</Badge>
                <Badge variant="outline">{buildInfo.deployMode}</Badge>
                {buildInfo.vercelEnvironment ? (
                  <Badge variant="outline">{buildInfo.vercelEnvironment}</Badge>
                ) : null}
              </div>

              <dl className="mt-3 grid gap-2 text-xs/relaxed">
                <div className="grid grid-cols-[5rem_1fr] gap-3">
                  <dt className="text-muted-foreground">Commit</dt>
                  <dd className="min-w-0">
                    {buildInfo.commitSha ? (
                      <a
                        className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                        href={GITHUB_COMMIT_URL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {buildInfo.commitShortSha}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">unknown</span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[5rem_1fr] gap-3">
                  <dt className="text-muted-foreground">Branch</dt>
                  <dd className="min-w-0 truncate text-foreground">
                    {buildInfo.commitRef || 'unknown'}
                  </dd>
                </div>
                <div className="grid grid-cols-[5rem_1fr] gap-3">
                  <dt className="text-muted-foreground">Built</dt>
                  <dd className="text-foreground">{buildTimeLabel}</dd>
                </div>
                {buildInfo.commitMessage ? (
                  <div className="grid grid-cols-[5rem_1fr] gap-3">
                    <dt className="text-muted-foreground">Change</dt>
                    <dd className="min-w-0 truncate text-foreground">
                      {buildInfo.commitMessage}
                    </dd>
                  </div>
                ) : null}
                {buildInfo.deploymentUrl ? (
                  <div className="grid grid-cols-[5rem_1fr] gap-3">
                    <dt className="text-muted-foreground">Deploy</dt>
                    <dd className="min-w-0">
                      <a
                        className="inline-flex max-w-full items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                        href={buildInfo.deploymentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="truncate">{buildInfo.deploymentUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
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
