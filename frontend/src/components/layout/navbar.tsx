import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SystemInfoDialog } from '@/components/system-info-dialog'
import { HelpDialog } from '@/components/help-dialog'

interface NavbarProps {
    isDark: boolean
    onToggleTheme: () => void
}

function AppStreamIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            fill="none"
            className={className}
        >
            <rect x="8" y="4" width="48" height="56" rx="8" ry="8" fill="currentColor" className="text-primary" />
            <rect x="12" y="8" width="40" height="48" rx="4" ry="4" fill="currentColor" className="text-primary/20" />
            <path d="M26 22L42 32L26 42V22Z" fill="currentColor" className="text-primary-foreground" />
            <rect x="18" y="26" width="4" height="2" rx="1" fill="currentColor" className="text-primary-foreground/60" />
            <rect x="16" y="31" width="6" height="2" rx="1" fill="currentColor" className="text-primary-foreground/80" />
            <rect x="18" y="36" width="4" height="2" rx="1" fill="currentColor" className="text-primary-foreground/60" />
            <rect x="24" y="10" width="16" height="3" rx="1.5" fill="currentColor" className="text-background" />
        </svg>
    )
}

export function Navbar({ isDark, onToggleTheme }: NavbarProps) {
    const [helpOpen, setHelpOpen] = useState(false)

    // Global keyboard shortcut for help
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Open help with ? key (not in input fields)
        if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
            e.preventDefault()
            setHelpOpen(true)
        }
    }, [])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    return (
        <>
            <nav className="border-b bg-card px-4 py-3 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-lg">
                        <AppStreamIcon className="h-6 w-6" />
                        AppStream
                    </div>
                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)}>
                                        <HelpCircle className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Help (Press ?)</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <SystemInfoDialog />
                        <Button variant="ghost" size="icon" onClick={onToggleTheme}>
                            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </nav>

            <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
        </>
    )
}
