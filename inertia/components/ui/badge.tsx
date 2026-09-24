import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-heat-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-ink-900 text-paper',
        secondary: 'border-transparent bg-ink-100 text-ink-700',
        accent: 'border-transparent bg-heat-100 text-heat-700',
        destructive: 'border-transparent bg-danger-soft text-danger',
        outline: 'text-ink-700 border-ink-900/25',
        success: 'border-transparent bg-fil-100 text-fil-700',
        warning: 'border-transparent bg-amber-soft text-amber-ink',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
