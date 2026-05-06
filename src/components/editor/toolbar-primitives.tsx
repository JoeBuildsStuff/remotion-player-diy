import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ToolbarIconButton({
  children,
  label,
  active,
}: {
  children: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={
            active
              ? 'h-7 w-7 bg-zinc-700 text-zinc-50 hover:bg-zinc-700'
              : 'h-7 w-7 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50'
          }
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-md bg-zinc-800/80 p-0.5">
      {children}
    </div>
  )
}
