import { useState, useEffect } from 'react'
import {
  Terminal,
  Play,
  Square,
  Edit,
  Trash,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Console, copyLogsToClipboard } from '@/components/ui/console'
import type {
  App,
  LogEntry,
  Platform,
  BuildType,
  BuildOutputType,
} from '@/types'

// Platform labels
const platformLabels: Record<Platform, string> = {
  android: 'Android',
  ios: 'iOS',
  web: 'Web',
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
}

// Platform output types
const platformOutputTypes: Record<Platform, { value: BuildOutputType; label: string }[]> = {
  android: [
    { value: 'apk', label: 'APK' },
    { value: 'appbundle', label: 'App Bundle (AAB)' },
  ],
  ios: [{ value: 'ipa', label: 'IPA' }],
  web: [{ value: 'web', label: 'Web Build' }],
  macos: [{ value: 'executable', label: 'Executable' }],
  windows: [{ value: 'executable', label: 'Executable' }],
  linux: [{ value: 'executable', label: 'Executable' }],
}

interface BuildConsoleProps {
  selectedApp: App | null
  logs: LogEntry[]
  isBuilding: boolean
  socketConnected: boolean
  onBuild: (platform: Platform, buildType: BuildType, outputType: BuildOutputType) => void
  onStopBuild: () => void
  onClearLogs: () => void
  onEditApp: () => void
  onDeleteApp: () => void
}

export function BuildConsole({
  selectedApp,
  logs,
  isBuilding,
  socketConnected,
  onBuild,
  onStopBuild,
  onClearLogs,
  onEditApp,
  onDeleteApp,
}: BuildConsoleProps) {
  // Build configuration state
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('android')
  const [buildType, setBuildType] = useState<BuildType>('release')
  const [outputType, setOutputType] = useState<BuildOutputType>('apk')

  // Update platform and output type when app changes
  useEffect(() => {
    if (selectedApp) {
      const platforms = selectedApp.platforms || ['android']
      if (platforms.length > 0) {
        const firstPlatform = platforms[0]
        setSelectedPlatform(firstPlatform)
        setOutputType(platformOutputTypes[firstPlatform][0].value)
      }
    }
  }, [selectedApp])

  // Update output type when platform changes
  useEffect(() => {
    const outputs = platformOutputTypes[selectedPlatform]
    if (outputs && outputs.length > 0) {
      setOutputType(outputs[0].value)
    }
  }, [selectedPlatform])

  const handleBuild = () => {
    if (!selectedApp) return
    onBuild(selectedPlatform, buildType, outputType)
  }

  const handleCopy = () => copyLogsToClipboard(logs)

  const availablePlatforms = selectedApp?.platforms || ['android']
  const availableOutputTypes = platformOutputTypes[selectedPlatform] || []

  // Determine connection status for console indicator
  const connectionStatus = socketConnected ? 'connected' : 'connecting'

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-1 flex flex-col overflow-hidden gap-4 pt-4">
        {/* Build Controls - Single Row */}
        {selectedApp ? (
          <div className="flex flex-wrap gap-3 items-center justify-between">
            {/* Build Configuration - Left Side */}
            <div className="flex items-center gap-2">
              <Select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
                disabled={isBuilding || availablePlatforms.length === 0}
                className="w-28"
              >
                {availablePlatforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platformLabels[platform]}
                  </option>
                ))}
              </Select>

              <Select
                value={buildType}
                onChange={(e) => setBuildType(e.target.value as BuildType)}
                disabled={isBuilding}
                className="w-24"
              >
                <option value="release">Release</option>
                <option value="debug">Debug</option>
              </Select>

              <Select
                value={outputType}
                onChange={(e) => setOutputType(e.target.value as BuildOutputType)}
                disabled={isBuilding || availableOutputTypes.length <= 1}
                className="w-40"
              >
                {availableOutputTypes.map((output) => (
                  <option key={output.value} value={output.value}>
                    {output.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Action Buttons - Right Side */}
            <div className="flex items-center gap-2">
              {isBuilding ? (
                <Button variant="destructive" size="sm" onClick={onStopBuild} className="gap-1.5">
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleBuild}
                  disabled={availablePlatforms.length === 0}
                  className="gap-1.5"
                >
                  <Play className="h-4 w-4" />
                  Build
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onEditApp} className="gap-1.5">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={onDeleteApp} className="gap-1.5">
                <Trash className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-muted-foreground text-sm">Select an app to configure build options</p>
          </div>
        )}

        {/* Console with Connection Indicator */}
        <Console
          logs={logs}
          emptyMessage="Build logs will appear here..."
          onCopy={handleCopy}
          onClear={onClearLogs}
          connectionStatus={connectionStatus}
        />
      </CardContent>
    </Card>
  )
}

// Welcome message component for when no app is selected
interface WelcomeMessageProps {
  hasProject?: boolean
}

export function WelcomeMessage({ hasProject = false }: WelcomeMessageProps) {
  return (
    <Card className="h-full flex items-center justify-center">
      <CardContent className="text-center py-16">
        <div className="relative mb-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-muted rounded-full" />
          <Terminal className="h-16 w-16 text-muted-foreground mx-auto relative z-10" />
        </div>
        {hasProject ? (
          <>
            <h5 className="text-xl font-semibold mb-2">
              Select an app to start building
            </h5>
            <p className="text-muted-foreground">
              Choose an app from the list or add a new one to begin
            </p>
          </>
        ) : (
          <>
            <h5 className="text-xl font-semibold mb-2">
              Welcome to AppStream
            </h5>
            <p className="text-muted-foreground">
              Add a Flutter project to get started, then create app configurations for your builds
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
