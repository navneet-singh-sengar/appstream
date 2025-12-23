import { useState, useEffect } from 'react'
import {
    Download,
    Trash2,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BuildHistoryRecord, Platform, BuildOutputType, App } from '@/types'
import { getBuildHistory, deleteBuild, API_BASE_URL } from '@/services/api'

// Platform labels
const platformLabels: Record<Platform, string> = {
    android: 'Android',
    ios: 'iOS',
    web: 'Web',
    macos: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
}

// Output type labels
const outputTypeLabels: Record<BuildOutputType, string> = {
    apk: 'APK',
    appbundle: 'AAB',
    ipa: 'IPA',
    web: 'Web',
    executable: 'Exe',
}

// Format duration in human-readable format
function formatDuration(seconds?: number): string {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
}

// Format timestamp
function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

interface BuildHistoryPanelProps {
    selectedApp: App | null
}

export function BuildHistoryPanel({ selectedApp }: BuildHistoryPanelProps) {
    const [history, setHistory] = useState<BuildHistoryRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch build history when app changes
    useEffect(() => {
        if (selectedApp) {
            fetchHistory()
        } else {
            setHistory([])
        }
    }, [selectedApp?.id])

    const fetchHistory = async () => {
        if (!selectedApp) return

        setLoading(true)
        setError(null)

        try {
            const data = await getBuildHistory(selectedApp.project_id, selectedApp.id)
            setHistory(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load build history')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (buildId: string) => {
        if (!selectedApp) return

        try {
            await deleteBuild(selectedApp.project_id, selectedApp.id, buildId)
            // Remove from local state
            setHistory((prev) => prev.filter((record) => record.build_id !== buildId))
        } catch (err) {
            console.error('Failed to delete build:', err)
        }
    }

    const handleDownload = (filename: string) => {
        window.open(`${API_BASE_URL}/download/${filename}`, '_blank')
    }

    if (!selectedApp) {
        return (
            <Card className="flex-1 flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground py-12">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select an app to view build history</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <h3 className="text-sm font-medium text-muted-foreground">
                        Build History for {selectedApp.appName}
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchHistory}
                        disabled={loading}
                        className="h-8"
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </Button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="text-center text-destructive py-4">
                        <p>{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchHistory} className="mt-2">
                            Retry
                        </Button>
                    </div>
                )}

                {/* Loading State */}
                {loading && history.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                        <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin opacity-50" />
                        <p>Loading build history...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && history.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No builds yet</p>
                        <p className="text-xs mt-1">Build history will appear here after your first build</p>
                    </div>
                )}

                {/* History List */}
                {history.length > 0 && (
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {history.map((record) => (
                            <div
                                key={record.build_id}
                                className={cn(
                                    'flex items-center gap-3 p-3 rounded-lg border bg-card',
                                    record.status === 'error' && 'border-destructive/30 bg-destructive/5'
                                )}
                            >
                                {/* Status Icon */}
                                <div className="shrink-0">
                                    {record.status === 'success' ? (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-destructive" />
                                    )}
                                </div>

                                {/* Build Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-xs">
                                            {platformLabels[record.platform]}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                            {outputTypeLabels[record.output_type]}
                                        </Badge>
                                        <Badge
                                            variant={record.build_type === 'release' ? 'default' : 'outline'}
                                            className="text-xs"
                                        >
                                            {record.build_type}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <span>{formatTimestamp(record.timestamp)}</span>
                                        {record.duration && (
                                            <>
                                                <span>•</span>
                                                <span>{formatDuration(record.duration)}</span>
                                            </>
                                        )}
                                        {record.error_message && (
                                            <span className="text-destructive truncate">
                                                {record.error_message}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {record.status === 'success' && record.filename && record.file_exists && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownload(record.filename!)}
                                            className="h-8 w-8 p-0"
                                            title="Download"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {record.status === 'success' && record.filename && !record.file_exists && (
                                        <span className="text-xs text-muted-foreground px-2">
                                            File deleted
                                        </span>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(record.build_id)}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

