import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'

/**
 * Layered buttons: a flat face on a thick ink "layer" that squashes when pressed, like a part being
 * printed. Compact sizes (sm, icon) and quiet variants stay flat so dense dashboards do not shout.
 */
const LAYER =
  'border-2 border-ink-900 border-b-[5px] origin-bottom hover:-translate-y-0.5 hover:border-b-[6px] active:translate-y-[3px] active:border-b-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[transform,background-color,border-width] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-500 focus-visible:ring-offset-2 ring-offset-paper disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-ink-900 text-paper hover:bg-ink-800',
        accent: 'bg-lime text-ink-900 hover:brightness-105',
        lime: 'bg-lime text-ink-900 hover:brightness-105',
        sun: 'bg-sun text-ink-900 hover:brightness-105',
        destructive: 'bg-danger text-white hover:bg-danger/90',
        outline: 'bg-paper-raised text-ink-900 hover:bg-paper-raised',
        secondary: 'bg-paper-sunken text-ink-900 hover:bg-ink-100',
        ghost: 'text-ink-700 hover:bg-ink-900/5',
        link: 'text-heat-700 underline underline-offset-4 hover:text-heat-800',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-14 rounded-md px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    compoundVariants: [
      ...(['default', 'accent', 'lime', 'sun', 'outline'] as const).flatMap((variant) =>
        (['default', 'lg'] as const).map((size) => ({ variant, size, className: LAYER }))
      ),
      { variant: 'default', size: 'default', className: 'border-b-ink-500' },
      { variant: 'default', size: 'lg', className: 'border-b-ink-500' },
      { variant: 'default', size: 'sm', className: 'active:translate-y-px' },
      {
        variant: 'outline',
        size: 'sm',
        className: 'border border-ink-900/25 bg-transparent hover:bg-ink-900/5',
      },
      {
        variant: 'outline',
        size: 'icon',
        className: 'border border-ink-900/25 bg-transparent hover:bg-ink-900/5',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
