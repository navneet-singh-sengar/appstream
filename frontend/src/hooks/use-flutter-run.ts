import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/store'
import { getSocket } from '@/services/socket'
import {
    getFlutterDevices,
    startFlutterRun,
    stopFlutterRun,
    hotReload,
    hotRestart,
    getFlutterStatus,
} from '@/services/api'
import type { LogEntry, RunMode } from '@/types'

export function useFlutterRun() {
    const [isStarting, setIsStarting] = useState(false)
    const [isStopping, setIsStopping] = useState(false)

    // Use store for device state (persists across tab switches)
    const devices = useStore((state) => state.devices)
    const selectedDevice = useStore((state) => state.selectedDevice)
    const isLoadingDevices = useStore((state) => state.isLoadingDevices)
    const devicesFetchedForProject = useStore((state) => state.devicesFetchedForProject)
    const setDevices = useStore((state) => state.setDevices)
    const setSelectedDevice = useStore((state) => state.setSelectedDevice)
    const setIsLoadingDevices = useStore((state) => state.setIsLoadingDevices)
    const setDevicesFetchedForProject = useStore((state) => state.setDevicesFetchedForProject)

    const flutterRun = useStore((state) => state.flutterRun)
    const selectedProject = useStore((state) => state.selectedProject)
    const selectedApp = useStore((state) => state.selectedApp)
    const setFlutterRunning = useStore((state) => state.setFlutterRunning)
    const addRunLog = useStore((state) => state.addRunLog)
    const setRunError = useStore((state) => state.setRunError)
    const clearRunLogs = useStore((state) => state.clearRunLogs)

    // Track if we're currently fetching to prevent duplicate calls
    const isFetchingRef = useRef(false)

    // Fetch devices (internal implementation)
    const fetchDevicesInternal = useCallback(async (forceRefresh = false) => {
        // Prevent duplicate fetches
        if (isFetchingRef.current) return

        // Skip if already fetched for this project (unless force refresh)
        if (!forceRefresh && selectedProject?.id === devicesFetchedForProject) {
            return
        }

        isFetchingRef.current = true
        setIsLoadingDevices(true)

        try {
            const deviceList = await getFlutterDevices(selectedProject?.id)
            setDevices(deviceList)
            setDevicesFetchedForProject(selectedProject?.id || null)

            // Auto-select first device if none selected
            if (deviceList.length > 0 && !selectedDevice) {
                setSelectedDevice(deviceList[0].id)
            }
        } catch (error) {
            console.error('Failed to fetch devices:', error)
            setRunError(error instanceof Error ? error.message : 'Failed to fetch devices')
        } finally {
            setIsLoadingDevices(false)
            isFetchingRef.current = false
        }
    }, [
        selectedProject?.id,
        devicesFetchedForProject,
        selectedDevice,
        setDevices,
        setSelectedDevice,
        setIsLoadingDevices,
        setDevicesFetchedForProject,
        setRunError,
    ])

    // Public fetch function - always forces refresh
    const fetchDevices = useCallback(() => {
        return fetchDevicesInternal(true)
    }, [fetchDevicesInternal])

    // Check initial status
    const checkStatus = useCallback(async () => {
        try {
            const status = await getFlutterStatus()
            setFlutterRunning(status.is_running, status.device)
            if (status.device) {
                setSelectedDevice(status.device)
            }
        } catch (error) {
            console.error('Failed to check Flutter status:', error)
        }
    }, [setFlutterRunning])

    // Start app
    const start = useCallback(async (runMode: RunMode = 'debug') => {
        if (!selectedDevice) {
            setRunError('No device selected')
            return
        }

        if (!selectedProject) {
            setRunError('No project selected')
            return
        }

        setIsStarting(true)
        clearRunLogs()
        setRunError(null)

        try {
            // Pass app_id and run_mode to get run settings
            await startFlutterRun(selectedDevice, selectedProject.id, selectedApp?.id, runMode)
            setFlutterRunning(true, selectedDevice)
        } catch (error) {
            console.error('Failed to start Flutter app:', error)
            setRunError(error instanceof Error ? error.message : 'Failed to start app')
            setFlutterRunning(false, null)
        } finally {
            setIsStarting(false)
        }
    }, [selectedDevice, selectedProject, selectedApp, clearRunLogs, setRunError, setFlutterRunning])

    // Stop app
    const stop = useCallback(async () => {
        setIsStopping(true)
        try {
            await stopFlutterRun()
            setFlutterRunning(false, null)
        } catch (error) {
            console.error('Failed to stop Flutter app:', error)
            setRunError(error instanceof Error ? error.message : 'Failed to stop app')
        } finally {
            setIsStopping(false)
        }
    }, [setFlutterRunning, setRunError])

    // Hot reload
    const reload = useCallback(async () => {
        if (!flutterRun.isRunning) {
            setRunError('App is not running')
            return
        }

        try {
            await hotReload()
        } catch (error) {
            console.error('Hot reload failed:', error)
            setRunError(error instanceof Error ? error.message : 'Hot reload failed')
        }
    }, [flutterRun.isRunning, setRunError])

    // Hot restart
    const restart = useCallback(async () => {
        if (!flutterRun.isRunning) {
            setRunError('App is not running')
            return
        }

        try {
            await hotRestart()
        } catch (error) {
            console.error('Hot restart failed:', error)
            setRunError(error instanceof Error ? error.message : 'Hot restart failed')
        }
    }, [flutterRun.isRunning, setRunError])

    // Setup socket listeners for run logs
    useEffect(() => {
        const socket = getSocket()

        const handleRunLog = (data: { log_entry: LogEntry }) => {
            addRunLog(data.log_entry)
        }

        const handleRunStatus = (data: { status: string; device: string | null }) => {
            setFlutterRunning(data.status === 'running', data.device)
            if (data.device) {
                setSelectedDevice(data.device)
            }
        }

        socket.on('run_log', handleRunLog)
        socket.on('run_status', handleRunStatus)

        return () => {
            socket.off('run_log', handleRunLog)
            socket.off('run_status', handleRunStatus)
        }
    }, [addRunLog, setFlutterRunning])

    // Fetch devices when project changes (smart caching)
    useEffect(() => {
        // Only fetch if project changed since last fetch
        if (selectedProject?.id !== devicesFetchedForProject) {
            fetchDevicesInternal(false)
        }
    }, [selectedProject?.id, devicesFetchedForProject, fetchDevicesInternal])

    // Check status on mount
    useEffect(() => {
        checkStatus()
    }, [checkStatus])

    return {
        // State
        devices,
        selectedDevice,
        isLoadingDevices,
        isStarting,
        isStopping,
        isRunning: flutterRun.isRunning,
        logs: flutterRun.logs,
        error: flutterRun.error,
        hasProject: !!selectedProject,

        // Actions
        setSelectedDevice,
        fetchDevices,
        start,
        stop,
        reload,
        restart,
        clearLogs: clearRunLogs,
    }
}
