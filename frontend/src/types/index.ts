// Project types
export interface Project {
  id: string
  name: string
  path: string
  created_at: string
  updated_at?: string
  is_cloned?: boolean
}

export interface ProjectFormData {
  name: string
  path: string
  // Clone mode fields
  sourceType?: 'local' | 'repository'
  repositoryUrl?: string
  destinationPath?: string
}

// Platform types
export type Platform = 'android' | 'ios' | 'web' | 'macos' | 'windows' | 'linux'

export const ALL_PLATFORMS: Platform[] = ['android', 'ios', 'web', 'macos', 'windows', 'linux']

export const PLATFORM_LABELS: Record<Platform, string> = {
  android: 'Android',
  ios: 'iOS',
  web: 'Web',
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
}

// Build output types per platform
export type AndroidOutputType = 'apk' | 'appbundle'
export type IOSOutputType = 'ipa'
export type WebOutputType = 'web'
export type DesktopOutputType = 'executable'

export type BuildOutputType = AndroidOutputType | IOSOutputType | WebOutputType | DesktopOutputType

export const PLATFORM_OUTPUT_TYPES: Record<Platform, { value: BuildOutputType; label: string }[]> = {
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

// Workflow step for pre/post build/run hooks
export interface WorkflowStep {
  id: string
  type: string
  name?: string
  config: Record<string, unknown>
}

// Workflow configuration with pre and post steps
export interface WorkflowConfig {
  preSteps: WorkflowStep[]
  postSteps: WorkflowStep[]
}

// Platform-specific settings (workflow only - args are now in custom_args step)
export interface PlatformSettings {
  workflow?: WorkflowConfig
}

// Build settings containing separate build and run configurations
export interface BuildSettings {
  build?: PlatformSettings
  run?: PlatformSettings
}

// App types
export interface App {
  id: string
  project_id: string
  appName: string
  packageId: string
  platforms: Platform[]
  logoUrl?: string
  buildSettings?: Partial<Record<Platform, BuildSettings>>
  created_at?: string
  updated_at?: string
}

export interface AppFormData {
  appName: string
  packageId: string
  platforms: Platform[]
  logoUrl?: string
  buildSettings?: Partial<Record<Platform, BuildSettings>>
}

// Log types
export interface LogEntry {
  timestamp: string
  message: string
  level: 'info' | 'success' | 'warning' | 'error' | 'terminal'
}

// Build types
export type BuildType = 'release' | 'debug' | 'profile'

// Run mode types (for flutter run)
export type RunMode = 'debug' | 'profile' | 'release'

export interface BuildResult {
  build_id: string
  output_path: string
  filename: string
  status: 'success' | 'error'
  platform: Platform
  output_type: BuildOutputType
}

export interface BuildState {
  isBuilding: boolean
  buildId: string | null
  logs: LogEntry[]
  result: BuildResult | null
  error: string | null
}

export interface BuildStatus {
  is_building: boolean
  build_id: string | null
  logs: LogEntry[]
}

// Flutter Run types
export interface FlutterDevice {
  id: string
  name: string
  platform: string
  isEmulator: boolean
}

export interface FlutterRunState {
  isRunning: boolean
  device: string | null
  logs: LogEntry[]
  error: string | null
}

export interface FlutterRunStatus {
  is_running: boolean
  device: string | null
  project_id: string | null
  logs_count: number
}

// Build History types
export interface BuildHistoryRecord {
  build_id: string
  timestamp: string
  platform: Platform
  build_type: BuildType
  output_type: BuildOutputType
  status: 'success' | 'error'
  filename?: string
  error_message?: string
  duration?: number
  file_exists?: boolean
}

// Step types for workflow configuration
export type StepFieldType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'file'

export interface StepConfigFieldOption {
  value: string
  label: string
}

export interface StepConfigField {
  name: string
  label: string
  type: StepFieldType
  required: boolean
  default?: unknown
  description: string
  options: StepConfigFieldOption[]
  placeholder: string
  accept?: string  // For file type: accepted file extensions (e.g., ".zip")
}

export interface StepType {
  type: string
  displayName: string
  description: string
  icon: string
  category: string
  configFields: StepConfigField[]
}

// Project Info types
export interface PubspecInfo {
  name: string
  version: string
  description: string
  dependencies_count: number
  dev_dependencies_count: number
}

export interface SdkVersions {
  flutter: string
  dart: string
  channel: string
}

export interface ProjectStats {
  dart_files: number
  total_lines: number
}

export interface ProjectInfo {
  pubspec: PubspecInfo | null
  sdk_versions: SdkVersions
  platforms: Platform[]
  stats: ProjectStats
}
