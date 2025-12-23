import { useState, useEffect, useRef } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import type { LogEntry } from '@/types'

/**
 * Format timestamp for display in console logs.
 */
export function formatLogTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Copy logs to clipboard as formatted text.
 */
export function copyLogsToClipboard(logs: LogEntry[]): void {
  const logText = logs
    .map((log) => `[${formatLogTime(log.timestamp)}] ${log.message}`)
    .join('\n')
  navigator.clipboard.writeText(logText).catch(console.error)
}

// ============================================================================
// Log Line
// ============================================================================

interface LogLineProps {
  log: LogEntry
}

export function LogLine({ log }: LogLineProps) {
  return (
    <div
      className={cn('py-0.5', {
        'text-blue-400': log.level === 'info',
        'text-green-400': log.level === 'success',
        'text-yellow-400': log.level === 'warning',
        'text-red-400': log.level === 'error',
        'text-zinc-400': log.level === 'terminal',
      })}
    >
      <span className="text-zinc-500">[{formatLogTime(log.timestamp)}]</span>{' '}
      {log.message}
    </div>
  )
}

// ============================================================================
// Console (Log Viewer with Hover Controls)
// ============================================================================

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

interface ConsoleProps {
  logs: LogEntry[]
  emptyMessage?: string
  emptyHint?: string
  className?: string
  onCopy?: () => void
  onClear?: () => void
  connectionStatus?: ConnectionStatus
}

export function Console({
  logs,
  emptyMessage = 'Logs will appear here...',
  emptyHint,
  className,
  onCopy,
  onClear,
  connectionStatus,
}: ConsoleProps) {
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleCopy = () => {
    if (onCopy) {
      onCopy()
    } else {
      copyLogsToClipboard(logs)
    }
  }

  const showControls = isHovered && logs.length > 0

  // Connection status indicator styles with heartbeat animation
  const statusStyles = {
    connected: 'bg-green-500 animate-heartbeat',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-red-500',
  }

  return (
    <div
      className={cn(
        'flex-1 bg-zinc-950 rounded-lg border overflow-hidden min-h-0 relative group',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Connection Status Indicator - Top Left */}
      {connectionStatus && (
        <div
          className={cn(
            'absolute top-2 left-2 z-20 h-2.5 w-2.5 rounded-full',
            statusStyles[connectionStatus]
          )}
          title={
            connectionStatus === 'connected'
              ? 'Connected to server'
              : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Disconnected'
          }
        />
      )}

      {/* Hover Controls - Top Right */}
      <div
        className={cn(
          'absolute top-2 right-2 z-10 flex gap-1 transition-opacity duration-200',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        {onClear && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onClear}
            className="h-7 px-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Log Content */}
      <div className="h-full overflow-y-auto p-4 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-zinc-500 text-center py-8">
            {emptyMessage}
            {emptyHint && (
              <>
                <br />
                <span className="text-xs">{emptyHint}</span>
              </>
            )}
          </div>
        ) : (
          <>
            {logs.map((log, index) => (
              <LogLine key={index} log={log} />
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>
    </div>
  )
}
