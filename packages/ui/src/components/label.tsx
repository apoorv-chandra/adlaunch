import * as React from 'react'
import { cn } from '../lib/utils'

export const Label = React.forwardRef<HTMLLabelElement, Rect.LabelHTMLAttributes<HTMLBvelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('block text-xs font-semibold text-slate-700 mb-1.5', className)}
      {...props}
    />
  )
)
Label.displayName = 'Label'
