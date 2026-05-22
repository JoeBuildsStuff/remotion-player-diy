import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Film, Plus, Trash } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  createProject,
  deleteProject,
  listProjects,
} from '@/lib/project-client'
import type { ProjectSummary } from '../../../shared/project-schema'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const items = await listProjects()
      setProjects(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onNew = useCallback(async () => {
    setCreating(true)
    try {
      const project = await createProject()
      navigate(`/editor/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setCreating(false)
    }
  }, [navigate])

  const onDelete = useCallback(
    async (id: string) => {
      try {
        await deleteProject(id)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [refresh],
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Open a project to keep editing, or start a new one.
            </p>
          </div>
          <Button
            variant="secondary"
            size="icon"
            aria-label="New project"
            onClick={onNew}
            disabled={creating}
          >
            <Plus className="size-4" />
          </Button>
        </header>

        {error && (
          <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {projects === null && !error ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : projects && projects.length === 0 ? (
          <EmptyState onNew={onNew} creating={creating} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.map((p) => (
              <li key={p.id}>
                <Card
                  className="cursor-pointer transition-colors hover:border-primary/50"
                  onClick={() => navigate(`/editor/${p.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="truncate">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {p.clipCount} clip{p.clipCount === 1 ? '' : 's'} · Updated{' '}
                      {formatRelative(p.updatedAt)}
                    </span>
                    <DeleteProjectDialog
                      projectName={p.name}
                      onConfirm={() => onDelete(p.id)}
                    />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function DeleteProjectDialog({
  projectName,
  onConfirm,
}: {
  projectName: string
  onConfirm: () => void | Promise<void>
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Delete project"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{projectName}&rdquo; will be permanently removed. Media files
            are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void onConfirm()}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function EmptyState({
  onNew,
  creating,
}: {
  onNew: () => void
  creating: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20 text-center">
      <Film className="size-10 text-muted-foreground" strokeWidth={1.5} />
      <div>
        <p className="font-medium">No projects yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first project to start editing.
        </p>
      </div>
      <Button onClick={onNew} disabled={creating}>
        <Plus className="size-4" />
        New project
      </Button>
    </div>
  )
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(timestamp).toLocaleDateString()
}
