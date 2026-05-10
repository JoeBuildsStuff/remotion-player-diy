import { useEffect, useMemo } from 'react'
import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useRendering } from '../model/use-rendering'

import { useEditor } from '../model/editor-context-value'

type RenderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function RenderDialog({ open, onOpenChange }: RenderDialogProps) {
  const { clips, fps, width, height, durationInFrames, exportSettings } =
    useEditor()
  const { state, renderMedia, reset } = useRendering()

  // List of media clips that are still uploading or failed — we won't render
  // until all are 'ready'.
  const pendingUploads = useMemo(
    () =>
      clips.filter(
        (c) =>
          c.type !== 'text' &&
          c.uploadStatus !== 'ready',
      ),
    [clips],
  )

  // Auto-start the render the first time the dialog opens, if everything is ready.
  useEffect(() => {
    if (!open) return
    if (state.status !== 'idle') return
    if (clips.length === 0) return
    if (pendingUploads.length > 0) return

    void renderMedia({
      clips,
      fps,
      width,
      height,
      durationInFrames,
      exportSettings,
    })
  }, [
    open,
    state.status,
    clips,
    fps,
    width,
    height,
    durationInFrames,
    exportSettings,
    pendingUploads.length,
    renderMedia,
  ])

  // Reset to idle when the dialog closes so the next open starts a new render.
  useEffect(() => {
    if (!open && state.status !== 'idle') {
      // Defer so the close animation isn't interrupted by re-render.
      const t = setTimeout(reset, 200)
      return () => clearTimeout(t)
    }
  }, [open, state.status, reset])

  const progressPercent =
    state.status === 'rendering' ? Math.round(state.progress * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export video</DialogTitle>
          <DialogDescription>
            {import.meta.env.VITE_DEPLOY_MODE === 'selfhost'
              ? 'Renders locally with @remotion/renderer. Bundling can add ~30 s to the first render after a container restart, then subsequent renders are fast.'
              : 'Renders on Vercel Sandbox. The first render after a deploy can take 30–60 s extra to warm up.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add at least one clip to the timeline before rendering.
            </p>
          ) : pendingUploads.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm">
                Waiting for {pendingUploads.length} source upload
                {pendingUploads.length === 1 ? '' : 's'} to finish:
              </p>
              <ul className="space-y-0.5 text-sm text-muted-foreground">
                {pendingUploads.map((c) => (
                  <li key={c.id}>
                    {c.name} —{' '}
                    {c.uploadStatus === 'error'
                      ? `failed: ${c.uploadError ?? 'unknown'}`
                      : (c.uploadStatus ?? 'pending')}
                  </li>
                ))}
              </ul>
            </div>
          ) : state.status === 'rendering' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{state.phase}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} />
              {state.subtitle ? (
                <p className="text-xs text-muted-foreground">
                  {state.subtitle}
                </p>
              ) : null}
            </div>
          ) : state.status === 'done' ? (
            <div className="space-y-2">
              <p className="text-sm">
                Render complete — {formatBytes(state.size)}.
              </p>
              <Button asChild className="w-full">
                <a href={state.url} download target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download video
                </a>
              </Button>
            </div>
          ) : state.status === 'error' ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Preparing…</p>
          )}
        </div>

        <DialogFooter>
          {state.status === 'done' || state.status === 'error' ? (
            <Button
              variant="secondary"
              onClick={() => {
                reset()
                void renderMedia({
                  clips,
                  fps,
                  width,
                  height,
                  durationInFrames,
                  exportSettings,
                })
              }}
            >
              Render again
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
