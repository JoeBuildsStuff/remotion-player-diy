import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        gray:
          "border-transparent bg-gray-600 text-white ring-1 ring-inset ring-gray-500/30 [a&]:hover:bg-gray-600/90 dark:bg-gray-500 dark:text-white",
        red:
          "border-transparent bg-red-600 text-white ring-1 ring-inset ring-red-500/30 [a&]:hover:bg-red-600/90 dark:bg-red-500 dark:text-white",
        yellow:
          "border-transparent bg-yellow-400 text-yellow-950 ring-1 ring-inset ring-yellow-500/30 [a&]:hover:bg-yellow-400/90 dark:bg-yellow-500 dark:text-yellow-950",
        orange:
          "border-transparent bg-orange-500 text-white ring-1 ring-inset ring-orange-400/30 [a&]:hover:bg-orange-500/90 dark:bg-orange-500 dark:text-white",
        amber:
          "border-transparent bg-amber-500 text-amber-950 ring-1 ring-inset ring-amber-400/30 [a&]:hover:bg-amber-500/90 dark:bg-amber-500 dark:text-amber-950",
        green:
          "border-transparent bg-green-600 text-white ring-1 ring-inset ring-green-500/30 [a&]:hover:bg-green-600/90 dark:bg-green-500 dark:text-white",
        blue:
          "border-transparent bg-blue-600 text-white ring-1 ring-inset ring-blue-500/30 [a&]:hover:bg-blue-600/90 dark:bg-blue-500 dark:text-white",
        indigo:
          "border-transparent bg-indigo-600 text-white ring-1 ring-inset ring-indigo-500/30 [a&]:hover:bg-indigo-600/90 dark:bg-indigo-500 dark:text-white",
        purple:
          "border-transparent bg-purple-600 text-white ring-1 ring-inset ring-purple-500/30 [a&]:hover:bg-purple-600/90 dark:bg-purple-500 dark:text-white",
        pink:
          "border-transparent bg-pink-600 text-white ring-1 ring-inset ring-pink-500/30 [a&]:hover:bg-pink-600/90 dark:bg-pink-500 dark:text-white",
        },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
