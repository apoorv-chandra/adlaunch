import * as React from 'react'
import { cn } from '../lib/utils'

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLBvElement>) {
  return <div className={cn('h-px bg-slate-200', className)} {...props} />
}
