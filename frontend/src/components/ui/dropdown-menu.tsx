import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DropdownMenuContextValue {
    open: boolean
    setOpen: (open: boolean) => void
    triggerRef: React.RefObject<HTMLButtonElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

interface DropdownMenuProps {
    children: React.ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
    const [open, setOpen] = React.useState(false)
    const triggerRef = React.useRef<HTMLButtonElement>(null)

    return (
        <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
            {children}
        </DropdownMenuContext.Provider>
    )
}

interface DropdownMenuTriggerProps {
    children: React.ReactNode
    asChild?: boolean
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
    const context = React.useContext(DropdownMenuContext)

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        context?.setOpen(!context.open)
    }

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLButtonElement> }>, {
            onClick: handleClick,
            ref: context?.triggerRef,
        })
    }

    return (
        <button ref={context?.triggerRef} onClick={handleClick}>
            {children}
        </button>
    )
}

interface DropdownMenuContentProps {
    children: React.ReactNode
    align?: 'start' | 'center' | 'end'
    className?: string
}

export function DropdownMenuContent({
    children,
    align = 'end',
    className,
}: DropdownMenuContentProps) {
    const context = React.useContext(DropdownMenuContext)
    const contentRef = React.useRef<HTMLDivElement>(null)

    // Calculate position synchronously when open changes
    const getPosition = React.useCallback(() => {
        if (!context?.triggerRef.current) {
            return { top: -9999, left: -9999 } // Off-screen default
        }
        
        const rect = context.triggerRef.current.getBoundingClientRect()
        const contentWidth = 160 // approximate width

        let left = rect.left
        if (align === 'end') {
            left = rect.right - contentWidth
        } else if (align === 'center') {
            left = rect.left + rect.width / 2 - contentWidth / 2
        }

        return {
            top: rect.bottom + 4,
            left: Math.max(8, left),
        }
    }, [context?.triggerRef, align])

    React.useEffect(() => {
        if (!context?.open) return

        const handleClickOutside = (e: MouseEvent) => {
            if (
                contentRef.current &&
                !contentRef.current.contains(e.target as Node) &&
                context.triggerRef.current &&
                !context.triggerRef.current.contains(e.target as Node)
            ) {
                context.setOpen(false)
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                context.setOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [context])

    if (!context?.open) return null

    const position = getPosition()

    return createPortal(
        <div
            ref={contentRef}
            className={cn(
                'fixed z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
                'animate-in fade-in-0 zoom-in-95 duration-100',
                className
            )}
            style={{ top: position.top, left: position.left }}
        >
            {children}
        </div>,
        document.body
    )
}

interface DropdownMenuItemProps {
    children: React.ReactNode
    onClick?: () => void
    className?: string
    variant?: 'default' | 'destructive'
    disabled?: boolean
}

export function DropdownMenuItem({
    children,
    onClick,
    className,
    variant = 'default',
    disabled = false,
}: DropdownMenuItemProps) {
    const context = React.useContext(DropdownMenuContext)

    const handleClick = () => {
        if (disabled) return
        onClick?.()
        context?.setOpen(false)
    }

    return (
        <button
            className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:bg-accent focus:text-accent-foreground',
                variant === 'destructive' && 'text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10',
                disabled && 'pointer-events-none opacity-50',
                className
            )}
            onClick={handleClick}
            disabled={disabled}
        >
            {children}
        </button>
    )
}

export function DropdownMenuSeparator() {
    return <div className="-mx-1 my-1 h-px bg-border" />
}
