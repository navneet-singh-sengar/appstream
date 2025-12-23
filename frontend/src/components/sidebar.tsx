import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const SIDEBAR_STORAGE_KEY = 'app-builder-sidebar-collapsed'
const SIDEBAR_WIDTH_EXPANDED = 280
const SIDEBAR_WIDTH_COLLAPSED = 64

interface SidebarContextValue {
    isCollapsed: boolean
    toggle: () => void
    expand: () => void
    collapse: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider')
    }
    return context
}

interface SidebarProviderProps {
    children: ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
        return stored === 'true'
    })

    useEffect(() => {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed))
    }, [isCollapsed])

    // Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault()
                setIsCollapsed((prev) => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const toggle = () => setIsCollapsed((prev) => !prev)
    const expand = () => setIsCollapsed(false)
    const collapse = () => setIsCollapsed(true)

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggle, expand, collapse }}>
            {children}
        </SidebarContext.Provider>
    )
}

interface SidebarProps {
    children: ReactNode
    className?: string
}

export function Sidebar({ children, className }: SidebarProps) {
    const { isCollapsed, toggle } = useSidebar()

    return (
        <aside
            className={cn(
                'h-full flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out relative',
                className
            )}
            style={{
                width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
                minWidth: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
            }}
        >
            {/* Sidebar Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {children}
            </div>

            {/* Toggle Button */}
            <div className="p-2 border-t border-border">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggle}
                    className={cn(
                        'w-full justify-center text-muted-foreground hover:text-foreground',
                        isCollapsed && 'px-0'
                    )}
                    title={isCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            <span className="text-xs">Collapse</span>
                        </>
                    )}
                </Button>
            </div>
        </aside>
    )
}

interface SidebarSectionProps {
    children: ReactNode
    className?: string
}

export function SidebarSection({ children, className }: SidebarSectionProps) {
    return (
        <div className={cn('flex-1 overflow-hidden flex flex-col', className)}>
            {children}
        </div>
    )
}

interface SidebarHeaderProps {
    icon: ReactNode
    title: string
    action?: ReactNode
}

export function SidebarHeader({ icon, title, action }: SidebarHeaderProps) {
    const { isCollapsed } = useSidebar()

    return (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0">{icon}</span>
                {!isCollapsed && (
                    <span className="font-medium text-sm truncate">{title}</span>
                )}
            </div>
            {!isCollapsed && action}
        </div>
    )
}

interface SidebarContentProps {
    children: ReactNode
    className?: string
}

export function SidebarContent({ children, className }: SidebarContentProps) {
    return (
        <div className={cn('flex-1 overflow-y-auto p-1.5', className)}>
            {children}
        </div>
    )
}

