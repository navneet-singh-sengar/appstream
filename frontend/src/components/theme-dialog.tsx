import { Check, Sun, Moon } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { ThemeId, Theme } from '@/lib/themes'

interface ThemeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    themeId: ThemeId
    availableThemes: Theme[]
    onSetTheme: (id: ThemeId) => void
}

function ThemeCard({ theme, isSelected, onClick }: { theme: Theme; isSelected: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`
                relative flex flex-col gap-2 p-3 rounded-lg border-2 transition-all text-left
                hover:border-primary/50
                ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}
            `}
        >
            {/* Theme preview */}
            <div 
                className="w-full h-20 rounded-md overflow-hidden border border-border/50 flex flex-col"
                style={{ backgroundColor: theme.preview.bg }}
            >
                {/* Simulated title bar */}
                <div 
                    className="h-5 flex items-center gap-1 px-2"
                    style={{ backgroundColor: theme.preview.bg, borderBottom: `1px solid ${theme.preview.fg}20` }}
                >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#febc2e' }} />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#28c840' }} />
                </div>
                {/* Content area */}
                <div className="flex-1 p-2 flex flex-col gap-1">
                    <div 
                        className="h-2 w-12 rounded-sm"
                        style={{ backgroundColor: theme.preview.accent }}
                    />
                    <div 
                        className="h-1.5 w-16 rounded-sm opacity-60"
                        style={{ backgroundColor: theme.preview.fg }}
                    />
                    <div 
                        className="h-1.5 w-10 rounded-sm opacity-40"
                        style={{ backgroundColor: theme.preview.fg }}
                    />
                </div>
            </div>
            
            {/* Theme info */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="font-medium text-sm">{theme.name}</div>
                    <div className="text-xs text-muted-foreground">{theme.description}</div>
                </div>
                {isSelected && (
                    <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                )}
            </div>
        </button>
    )
}

export function ThemeDialog({ open, onOpenChange, themeId, availableThemes, onSetTheme }: ThemeDialogProps) {
    const lightThemes = availableThemes.filter(t => !t.isDark)
    const darkThemes = availableThemes.filter(t => t.isDark)

    const handleSelectTheme = (id: ThemeId) => {
        onSetTheme(id)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Choose Theme</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Light Themes Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sun className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Light</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {lightThemes.map(theme => (
                                <ThemeCard
                                    key={theme.id}
                                    theme={theme}
                                    isSelected={themeId === theme.id}
                                    onClick={() => handleSelectTheme(theme.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Dark Themes Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Moon className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dark</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {darkThemes.map(theme => (
                                <ThemeCard
                                    key={theme.id}
                                    theme={theme}
                                    isSelected={themeId === theme.id}
                                    onClick={() => handleSelectTheme(theme.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

