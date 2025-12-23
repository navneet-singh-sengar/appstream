import { useCallback, useEffect } from 'react'
import { useStore } from '@/store'
import * as api from '@/services/api'
import { joinBuild } from '@/services/socket'
import type { Platform, BuildType, BuildOutputType } from '@/types'

export function useBuild() {
  const {
    build,
    startBuild,
    restoreBuildState,
    setBuildResult,
    setBuildError,
    clearBuild,
    clearBuildLogs,
    stopBuild: stopBuildState,
  } = useStore()

  // Check for ongoing build on mount
  useEffect(() => {
    async function checkBuildStatus() {
      try {
        const status = await api.getBuildStatus()
        if (status.is_building && status.build_id) {
          // Restore build state with existing logs
          restoreBuildState(status.build_id, status.logs)
          // Join WebSocket room to receive new logs
          joinBuild(status.build_id)
        }
      } catch (error) {
        console.error('Failed to check build status:', error)
      }
    }

    checkBuildStatus()
  }, [restoreBuildState])

  const buildApp = useCallback(
    async (
      appId: string,
      platform: Platform,
      buildType: BuildType,
      outputType: BuildOutputType
    ): Promise<void> => {
      // Clear previous logs and start build state immediately
      clearBuildLogs()
      startBuild('pending')

      try {
        const result = await api.buildApp(appId, platform, buildType, outputType)

        // Join WebSocket build session with actual build_id
        joinBuild(result.build_id)

        // Set build result
        setBuildResult(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Build failed'
        setBuildError(message)
        throw error
      }
    },
    [startBuild, setBuildResult, setBuildError, clearBuildLogs]
  )

  const stopBuild = useCallback(async (): Promise<void> => {
    try {
      await api.stopBuild()
      stopBuildState()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop build'
      setBuildError(message)
      throw error
    }
  }, [stopBuildState, setBuildError])

  const downloadOutput = useCallback(async (filename: string): Promise<void> => {
    await api.downloadOutput(filename)
  }, [])

  return {
    build,
    buildApp,
    stopBuild,
    downloadOutput,
    clearBuild,
    clearBuildLogs,
  }
}
