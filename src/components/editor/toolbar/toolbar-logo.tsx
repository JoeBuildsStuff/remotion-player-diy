import { Clapperboard } from 'lucide-react'

export function ToolbarLogo() {
  return (
    <div
      aria-label="Remotion Player DIY"
      className="flex items-center gap-2 justify-self-start bg-background px-1.5 py-1 text-xs/relaxed font-medium text-foreground"
    >
      <div className="rounded-lg bg-foreground p-1.5 text-background dark:bg-secondary dark:text-foreground">
        <Clapperboard className="size-5" />
      </div>
      <span className="hidden sm:block">Remotion Player DIY</span>
    </div>
  )
}
