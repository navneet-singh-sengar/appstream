import { useState, useMemo } from 'react'
import { Search, Plus, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    useSidebar,
    SidebarSection,
    SidebarHeader,
    SidebarContent,
} from '@/components/sidebar'
import type { App, Platform } from '@/types'

interface AppListProps {
    apps: App[]
    selectedApp: App | null
    isLoading: boolean
    onSelectApp: (app: App) => void
    onAddApp: () => void
}

export function AppList({
    apps,
    selectedApp,
    isLoading,
    onSelectApp,
    onAddApp,
}: AppListProps) {
    const { isCollapsed } = useSidebar()
    const [searchQuery, setSearchQuery] = useState('')

    const filteredApps = useMemo(() => {
        if (!searchQuery.trim()) return apps
        const query = searchQuery.toLowerCase()
        return apps.filter(
            (app) =>
                app.appName.toLowerCase().includes(query) ||
                app.packageId.toLowerCase().includes(query)
        )
    }, [apps, searchQuery])

    return (
        <SidebarSection>
            <SidebarHeader
                icon={<Layers className="h-4 w-4" />}
                title="Apps"
                action={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={onAddApp}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                }
            />

            <SidebarContent className="flex flex-col gap-2">
                {/* Search - only show when expanded */}
                {!isCollapsed && (
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-sm"
                        />
                    </div>
                )}

                {/* App List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Spinner className="h-4 w-4" />
                        </div>
                    ) : filteredApps.length === 0 ? (
                        <EmptyState
                            isCollapsed={isCollapsed}
                            hasSearch={!!searchQuery}
                            onAddApp={onAddApp}
                        />
                    ) : (
                        <div className="space-y-0.5">
                            {filteredApps.map((app) => (
                                <AppItem
                                    key={app.id}
                                    app={app}
                                    isSelected={selectedApp?.id === app.id}
                                    isCollapsed={isCollapsed}
                                    onClick={() => onSelectApp(app)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </SidebarContent>
        </SidebarSection>
    )
}

interface EmptyStateProps {
    isCollapsed: boolean
    hasSearch: boolean
    onAddApp: () => void
}

function EmptyState({ isCollapsed, hasSearch, onAddApp }: EmptyStateProps) {
    if (isCollapsed) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-full h-10"
                            onClick={onAddApp}
                        >
                            <Plus className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>Add app</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <div className="text-center py-6 px-2">
            <p className="text-xs text-muted-foreground mb-2">
                {hasSearch ? 'No apps found' : 'No apps'}
            </p>
            {!hasSearch && (
                <Button variant="ghost" size="sm" onClick={onAddApp} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add App
                </Button>
            )}
        </div>
    )
}

interface AppItemProps {
    app: App
    isSelected: boolean
    isCollapsed: boolean
    onClick: () => void
}

function AppItem({ app, isSelected, isCollapsed, onClick }: AppItemProps) {
    const initial = app.appName.charAt(0).toUpperCase()
    const hasLogo = !!app.logoUrl

    if (isCollapsed) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            className={cn(
                                'w-full flex items-center justify-center h-10 rounded-md transition-colors relative',
                                isSelected
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            )}
                            onClick={onClick}
                        >
                            {hasLogo ? (
                                <img
                                    src={app.logoUrl}
                                    alt={app.appName}
                                    className="w-7 h-7 rounded-md object-cover"
                                />
                            ) : (
                                <span
                                    className={cn(
                                        'w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                    )}
                                >
                                    {initial}
                                </span>
                            )}
                            {/* Platform count indicator */}
                            <span className="absolute bottom-1 right-2 flex gap-0.5">
                                {app.platforms.slice(0, 3).map((_, i) => (
                                    <span
                                        key={i}
                                        className={cn(
                                            'w-1 h-1 rounded-full',
                                            isSelected ? 'bg-primary-foreground/60' : 'bg-muted-foreground/40'
                                        )}
                                    />
                                ))}
                            </span>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p className="font-medium">{app.appName}</p>
                        <p className="text-xs text-muted-foreground">{app.packageId}</p>
                        <div className="flex gap-2 mt-1">
                            {app.platforms.map((p) => (
                                <PlatformIcon key={p} platform={p} className="h-3.5 w-3.5" />
                            ))}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <button
            className={cn(
                'w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors text-left',
                isSelected
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted/50'
            )}
            onClick={onClick}
        >
            {/* Avatar / Logo */}
            {hasLogo ? (
                <img
                    src={app.logoUrl}
                    alt={app.appName}
                    className="w-8 h-8 rounded-md object-cover shrink-0"
                />
            ) : (
                <span
                    className={cn(
                        'w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium shrink-0',
                        isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                    )}
                >
                    {initial}
                </span>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{app.appName}</p>
                <p className="text-xs text-muted-foreground truncate mb-1">
                    {app.packageId}
                </p>
                {/* Platform icons */}
                <div className="flex items-center gap-1.5">
                    {app.platforms.map((platform) => (
                        <TooltipProvider key={platform}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-muted-foreground hover:text-foreground transition-colors">
                                        <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p className="text-xs">{platformLabels[platform]}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
            </div>
        </button>
    )
}

const platformLabels: Record<Platform, string> = {
    android: 'Android',
    ios: 'iOS',
    web: 'Web',
    macos: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
}

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
    const iconClass = cn('w-4 h-4', className)

    switch (platform) {
        case 'android':
            return (
                <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
                </svg>
            )
        case 'ios':
            return (
                <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
            )
        case 'web':
            return (
                <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
            )
        case 'macos':
            return (
                <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
            )
        case 'windows':
            return (
                <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z" />
                </svg>
            )
        case 'linux':
            return (
                <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.117-.468.32-.753.696-.933z" />
                </svg>
            )
        default:
            return null
    }
}
