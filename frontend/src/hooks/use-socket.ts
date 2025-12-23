import { useEffect, useCallback } from 'react'
import { getSocket, connectSocket, disconnectSocket } from '@/services/socket'
import { useStore } from '@/store'
import type { LogEntry } from '@/types'

interface BuildLogEvent {
  build_id: string
  log_entry: {
    timestamp: string
    message: string
    level: string
  }
}

export function useSocket() {
  const { setSocketConnected, addBuildLog } = useStore()

  useEffect(() => {
    const socket = getSocket()

    function handleConnect() {
      console.log('Connected to server via WebSocket')
      setSocketConnected(true)
    }

    function handleDisconnect() {
      console.log('Disconnected from server')
      setSocketConnected(false)
    }

    function handleBuildLog(data: BuildLogEvent) {
      const logEntry: LogEntry = {
        timestamp: data.log_entry.timestamp,
        message: data.log_entry.message,
        level: data.log_entry.level as LogEntry['level'],
      }

      addBuildLog(logEntry)
    }

    // Set up event listeners
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('build_log', handleBuildLog)

    // Connect socket
    connectSocket()

    // Cleanup
    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('build_log', handleBuildLog)
      disconnectSocket()
    }
  }, [setSocketConnected, addBuildLog])

  const joinBuild = useCallback((buildId: string) => {
    const socket = getSocket()
    if (socket.connected) {
      socket.emit('join_build', { build_id: buildId })
    }
  }, [])

  return { joinBuild }
}
