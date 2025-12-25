import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Play,
    Square,
    RefreshCw,
    RotateCcw,
    RefreshCcw,
    Smartphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { Console, copyLogsToClipboard } from '@/components/ui/console'
import { useFlutterRun } from '@/hooks/use-flutter-run'
import type { RunMode } from '@/types'

interface FlutterRunPanelProps {
    socketConnected: boolean
}

export function FlutterRunPanel({ socketConnected }: FlutterRunPanelProps) {
    const {
        devices,
        selectedDevice,
        isLoadingDevices,
        isStarting,
        isStopping,
        isRunning,
        logs,
        error,
        setSelectedDevice,
        fetchDevices,
        start,
        stop,
        reload,
        restart,
        clearLogs,
    } = useFlutterRun()

    const [runMode, setRunMode] = useState<RunMode>('debug')
    const panelRef = useRef<HTMLDivElement>(null)

    // Keyboard shortcuts
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Only handle if panel is focused or has focus within
            if (!panelRef.current?.contains(document.activeElement)) {
                return
            }

            if (e.key === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault()
                if (isRunning) {
                    reload()
                }
            } else if (e.key === 'R' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault()
                if (isRunning) {
                    restart()
                }
            }
        },
        [isRunning, reload, restart]
    )

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    const handleCopy = () => copyLogsToClipboard(logs)

    const handleStart = () => {
        start(runMode)
    }

    // Determine connection status for console indicator
    const connectionStatus = socketConnected ? 'connected' : 'connecting'

    return (
        <Card className="h-full flex flex-col" ref={panelRef} tabIndex={0}>
            <CardContent className="flex-1 flex flex-col overflow-hidden gap-4 pt-4">
                {/* Controls Row */}
                <div className="flex flex-wrap gap-3 items-center justify-between">
                    {/* Device Selector and Run Mode */}
                    <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <Select
                            value={selectedDevice || ''}
                            onChange={(e) => setSelectedDevice(e.target.value)}
                            disabled={isRunning || isLoadingDevices}
                            className="w-48"
                        >
                            {devices.length === 0 ? (
                                <option value="">No devices found</option>
                            ) : (
                                devices.map((device) => (
                                    <option key={device.id} value={device.id}>
                                        {device.name} {device.isEmulator ? '(Emulator)' : ''}
                                    </option>
                                ))
                            )}
                        </Select>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchDevices}
                            disabled={isLoadingDevices || isRunning}
                            title="Refresh devices"
                        >
                            <RefreshCcw
                                className={cn('h-4 w-4', isLoadingDevices && 'animate-spin')}
                            />
                        </Button>

                        {/* Run Mode Selector */}
                        <Select
                            value={runMode}
                            onChange={(e) => setRunMode(e.target.value as RunMode)}
                            disabled={isRunning}
                            className="w-24"
                        >
                            <option value="debug">Debug</option>
                            <option value="profile">Profile</option>
                            <option value="release">Release</option>
                        </Select>
                    </div>

                    {/* Run Controls with Status Badge */}
                    <div className="flex items-center gap-2">
                        <StatusBadge isRunning={isRunning} />

                        {!isRunning ? (
                            <Button
                                onClick={handleStart}
                                disabled={!selectedDevice || isStarting || !socketConnected}
                                size="sm"
                                className="gap-1.5"
                            >
                                <Play className="h-4 w-4" />
                                {isStarting ? 'Starting...' : 'Run'}
                            </Button>
                        ) : (
                            <Button
                                variant="destructive"
                                onClick={stop}
                                disabled={isStopping}
                                size="sm"
                                className="gap-1.5"
                            >
                                <Square className="h-4 w-4" />
                                {isStopping ? 'Stopping...' : 'Stop'}
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={reload}
                            disabled={!isRunning}
                            className="gap-1.5"
                            title="Hot Reload (r)"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Reload
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={restart}
                            disabled={!isRunning}
                            className="gap-1.5"
                            title="Hot Restart (R)"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Restart
                        </Button>
                    </div>
                </div>

                {/* Error Alert - Only show when there's an error or running */}
                <RunStatusAlert isRunning={isRunning} error={error} deviceName={
                    devices.find((d) => d.id === selectedDevice)?.name || selectedDevice
                } runMode={runMode} />

                {/* Console with Connection Indicator */}
                <Console
                    logs={logs}
                    emptyMessage="Flutter run logs will appear here..."
                    emptyHint="Press r for hot reload, R for hot restart"
                    onCopy={handleCopy}
                    onClear={clearLogs}
                    connectionStatus={connectionStatus}
                />
            </CardContent>
        </Card>
    )
}

interface StatusBadgeProps {
    isRunning: boolean
}

function StatusBadge({ isRunning }: StatusBadgeProps) {
    return (
        <span
            className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                isRunning
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-zinc-500/20 text-zinc-500'
            )}
        >
            {isRunning ? 'Running' : 'Stopped'}
        </span>
    )
}

interface RunStatusAlertProps {
    isRunning: boolean
    error: string | null
    deviceName: string | null
    runMode: RunMode
}

function RunStatusAlert({ isRunning, error, deviceName, runMode }: RunStatusAlertProps) {
    if (error) {
        return (
            <Alert variant="destructive">
                <div className="flex items-center gap-2">{error}</div>
            </Alert>
        )
    }

    if (isRunning) {
        const modeLabel = runMode.charAt(0).toUpperCase() + runMode.slice(1)
        return (
            <Alert>
                <div className="flex items-center gap-2 text-green-600">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Running on {deviceName || 'device'} ({modeLabel} mode)
                </div>
            </Alert>
        )
    }

    // No status to show - connection is indicated by the console dot
    return null
}
