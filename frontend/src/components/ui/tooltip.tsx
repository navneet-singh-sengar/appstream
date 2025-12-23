import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipProviderProps {
    children: React.ReactNode
    delayDuration?: number
}

interface TooltipContextValue {
    open: boolean
    setOpen: (open: boolean) => void
    delayDuration: number
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

export function TooltipProvider({
    children,
    delayDuration = 200,
}: TooltipProviderProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <TooltipContext.Provider value={{ open, setOpen, delayDuration }}>
            {children}
        </TooltipContext.Provider>
    )
}

interface TooltipProps {
    children: React.ReactNode
}

export function Tooltip({ children }: TooltipProps) {
    return <>{children}</>
}

interface TooltipTriggerProps {
    children: React.ReactNode
    asChild?: boolean
}

export function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
    const context = React.useContext(TooltipContext)
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleMouseEnter = () => {
        if (context) {
            timeoutRef.current = setTimeout(() => {
                context.setOpen(true)
            }, context.delayDuration)
        }
    }

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        context?.setOpen(false)
    }

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
            onMouseEnter: handleMouseEnter,
            onMouseLeave: handleMouseLeave,
        })
    }

    return (
        <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}
        </span>
    )
}

interface TooltipContentProps {
    children: React.ReactNode
    side?: 'top' | 'right' | 'bottom' | 'left'
    className?: string
}

export function TooltipContent({
    children,
    side = 'top',
    className,
}: TooltipContentProps) {
    const context = React.useContext(TooltipContext)

    if (!context?.open) return null

    const sideClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    }

    return (
        <div
            className={cn(
                'absolute z-50 px-3 py-1.5 text-sm bg-popover text-popover-foreground rounded-md shadow-md border border-border animate-in fade-in-0 zoom-in-95',
                sideClasses[side],
                className
            )}
        >
            {children}
        </div>
    )
}

