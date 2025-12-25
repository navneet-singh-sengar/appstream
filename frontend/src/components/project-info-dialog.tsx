import { useState, useEffect } from 'react'
import {
    Package,
    Code2,
    FileCode,
    Layers,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
} from '@/components/ui/dialog'
import { getProjectInfo } from '@/services/api'
import type { Project, ProjectInfo, Platform } from '@/types'

interface ProjectInfoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project: Project | null
}

const platformIcons: Record<Platform, string> = {
    android: '🤖',
    ios: '🍎',
    web: '🌐',
    macos: '💻',
    windows: '🪟',
    linux: '🐧',
}

const platformLabels: Record<Platform, string> = {
    android: 'Android',
    ios: 'iOS',
    web: 'Web',
    macos: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
}

export function ProjectInfoDialog({ open, onOpenChange, project }: ProjectInfoDialogProps) {
    const [info, setInfo] = useState<ProjectInfo | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open && project) {
            loadProjectInfo()
        } else {
            setInfo(null)
            setError(null)
        }
    }, [open, project?.id])

    const loadProjectInfo = async () => {
        if (!project) return

        setIsLoading(true)
        setError(null)

        try {
            const data = await getProjectInfo(project.id)
            setInfo(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load project info')
        } finally {
            setIsLoading(false)
        }
    }

    const formatNumber = (num: number): string => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k'
        }
        return num.toString()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        Project Info
                    </DialogTitle>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center gap-2 text-destructive py-4">
                            <AlertCircle className="h-5 w-5" />
                            <span>{error}</span>
                        </div>
                    ) : info ? (
                        <>
                            {/* Pubspec Info */}
                            {info.pubspec && (
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">{info.pubspec.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md font-mono text-xs">
                                            v{info.pubspec.version}
                                        </span>
                                    </div>
                                    {info.pubspec.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {info.pubspec.description}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* SDK Versions */}
                            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Code2 className="h-4 w-4 text-blue-500" />
                                    SDK Versions
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Flutter</span>
                                        <span className="font-mono">{info.sdk_versions.flutter}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Dart</span>
                                        <span className="font-mono">{info.sdk_versions.dart}</span>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Channel: {info.sdk_versions.channel}
                                </div>
                            </div>

                            {/* Platforms */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Layers className="h-4 w-4 text-green-500" />
                                    Supported Platforms
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {info.platforms.length > 0 ? (
                                        info.platforms.map((platform) => (
                                            <span
                                                key={platform}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-md text-sm"
                                            >
                                                <span>{platformIcons[platform]}</span>
                                                {platformLabels[platform]}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground">
                                            No platforms detected
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Statistics */}
                            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <FileCode className="h-4 w-4 text-purple-500" />
                                    Project Statistics
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="text-center p-2 bg-background rounded-md">
                                        <div className="text-2xl font-bold text-primary">
                                            {info.stats.dart_files}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Dart Files</div>
                                    </div>
                                    <div className="text-center p-2 bg-background rounded-md">
                                        <div className="text-2xl font-bold text-primary">
                                            {formatNumber(info.stats.total_lines)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Lines of Code</div>
                                    </div>
                                </div>
                                {info.pubspec && (
                                    <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-1">
                                        <span>{info.pubspec.dependencies_count} dependencies</span>
                                        <span>•</span>
                                        <span>{info.pubspec.dev_dependencies_count} dev dependencies</span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                </DialogBody>
            </DialogContent>
        </Dialog>
    )
}

