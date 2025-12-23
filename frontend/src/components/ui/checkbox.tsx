import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: React.ReactNode
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, id, ...props }, ref) => {
        const inputId = id || React.useId()

        return (
            <label
                htmlFor={inputId}
                className={cn(
                    'flex items-center gap-3 cursor-pointer select-none',
                    props.disabled && 'cursor-not-allowed opacity-50',
                    className
                )}
            >
                <div className="relative">
                    <input
                        type="checkbox"
                        id={inputId}
                        ref={ref}
                        className="peer sr-only"
                        {...props}
                    />
                    <div
                        className={cn(
                            'h-5 w-5 shrink-0 rounded border border-primary ring-offset-background transition-colors',
                            'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
                            'peer-checked:bg-primary peer-checked:text-primary-foreground',
                            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                            !props.checked && 'bg-background'
                        )}
                    >
                        {props.checked && (
                            <Check className="h-4 w-4 text-primary-foreground absolute top-0.5 left-0.5" />
                        )}
                    </div>
                </div>
                {label && <span className="text-sm font-medium leading-none">{label}</span>}
            </label>
        )
    }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
