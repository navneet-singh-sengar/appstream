import { Hammer, Play, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConsoleTab = 'build' | 'run' | 'history'

interface ConsoleTabsProps {
    activeTab: ConsoleTab
    onTabChange: (tab: ConsoleTab) => void
}

export function ConsoleTabs({ activeTab, onTabChange }: ConsoleTabsProps) {
    return (
        <div className="flex border-b mb-2 shrink-0">
            <button
                onClick={() => onTabChange('build')}
                className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'build'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
            >
                <Hammer className="h-4 w-4" />
                Build
            </button>
            <button
                onClick={() => onTabChange('run')}
                className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'run'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
            >
                <Play className="h-4 w-4" />
                Run
            </button>
            <button
                onClick={() => onTabChange('history')}
                className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'history'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
            >
                <Clock className="h-4 w-4" />
                History
            </button>
        </div>
    )
}
