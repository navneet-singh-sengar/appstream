import type {
  Project,
  ProjectFormData,
  App,
  AppFormData,
  BuildResult,
  BuildStatus,
  BuildHistoryRecord,
  FlutterDevice,
  FlutterRunStatus,
  LogEntry,
  Platform,
  BuildType,
  BuildOutputType,
  StepType,
} from '@/types'

export const API_BASE_URL = '/api'

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(error.error || 'Request failed', response.status)
  }
  return response.json()
}

// Project API
export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/projects`)
  return handleResponse<Project[]>(response)
}

export async function fetchProject(projectId: string): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`)
  return handleResponse<Project>(response)
}

export async function createProject(data: ProjectFormData): Promise<{ id: string; message: string; project: Project }> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  return handleResponse<{ id: string; message: string; project: Project }>(response)
}

export async function updateProject(
  projectId: string,
  data: Partial<ProjectFormData>
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  return handleResponse<{ message: string }>(response)
}

export async function deleteProject(projectId: string, deleteFolder: boolean = false): Promise<{ message: string }> {
  const params = deleteFolder ? '?delete_folder=true' : ''
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}${params}`, {
    method: 'DELETE',
  })

  return handleResponse<{ message: string }>(response)
}

// Convenience function: Remove project from workspace (keeps folder on disk)
export async function removeProject(projectId: string): Promise<{ message: string }> {
  return deleteProject(projectId, false)
}

// Batch project operations
export interface BatchProjectResult {
  project_id: string
  project_name: string
  status: 'success' | 'error'
  message: string
}

export async function deleteProjectsBatch(
  projectIds: string[],
  deleteFolder: boolean = false
): Promise<{ results: BatchProjectResult[] }> {
  const response = await fetch(`${API_BASE_URL}/projects/batch`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ project_ids: projectIds, delete_folder: deleteFolder }),
  })
  return handleResponse<{ results: BatchProjectResult[] }>(response)
}

// Convenience functions for batch operations
export async function removeProjectsBatch(projectIds: string[]): Promise<{ results: BatchProjectResult[] }> {
  return deleteProjectsBatch(projectIds, false)
}

export async function deleteProjectsFoldersBatch(projectIds: string[]): Promise<{ results: BatchProjectResult[] }> {
  return deleteProjectsBatch(projectIds, true)
}

export async function cloneProject(data: {
  name: string
  repositoryUrl: string
  destinationPath?: string
}): Promise<{ id: string; message: string; project: Project }> {
  const response = await fetch(`${API_BASE_URL}/projects/clone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  return handleResponse<{ id: string; message: string; project: Project }>(response)
}

export async function getProjectPlatforms(projectId: string): Promise<{ project_id: string; platforms: Platform[] }> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/platforms`)
  return handleResponse<{ project_id: string; platforms: Platform[] }>(response)
}

// App API (scoped to project)
export async function fetchApps(projectId?: string): Promise<App[]> {
  if (projectId) {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/apps`)
    return handleResponse<App[]>(response)
  }
  // Fallback to all apps
  const response = await fetch(`${API_BASE_URL}/apps`)
  return handleResponse<App[]>(response)
}

export async function fetchApp(appId: string): Promise<App> {
  const response = await fetch(`${API_BASE_URL}/apps/${appId}`)
  return handleResponse<App>(response)
}

export async function createApp(projectId: string, data: AppFormData): Promise<{ id: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/apps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appName: data.appName.trim(),
      packageId: data.packageId.trim(),
      platforms: data.platforms,
      logoUrl: data.logoUrl,
      buildSettings: data.buildSettings,
    }),
  })

  return handleResponse<{ id: string; message: string }>(response)
}

export async function updateApp(
  appId: string,
  data: Partial<App>
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/apps/${appId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  return handleResponse<{ message: string }>(response)
}

export async function deleteApp(appId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/apps/${appId}`, {
    method: 'DELETE',
  })

  return handleResponse<{ message: string }>(response)
}

// Build API
export async function buildApp(
  appId: string,
  platform: Platform,
  buildType: BuildType,
  outputType: BuildOutputType
): Promise<BuildResult> {
  const response = await fetch(`${API_BASE_URL}/build/${appId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform,
      build_type: buildType,
      output_type: outputType,
    }),
  })

  return handleResponse<BuildResult>(response)
}

export async function stopBuild(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/build/stop`, {
    method: 'POST',
  })

  return handleResponse<{ status: string }>(response)
}

export async function getBuildStatus(): Promise<BuildStatus> {
  const response = await fetch(`${API_BASE_URL}/build/status`)
  return handleResponse<BuildStatus>(response)
}

export function getDownloadUrl(filename: string): string {
  return `${API_BASE_URL}/download/${filename}`
}

export async function downloadOutput(filename: string): Promise<void> {
  const response = await fetch(getDownloadUrl(filename))

  if (!response.ok) {
    throw new ApiError('Failed to download file', response.status)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

// Assets API
export async function uploadAssets(
  appId: string,
  files: File[]
): Promise<{ message: string; files: string[] }> {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await fetch(`${API_BASE_URL}/upload/${appId}/assets`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse<{ message: string; files: string[] }>(response)
}

// Flutter Run API
export async function getFlutterDevices(projectId?: string): Promise<FlutterDevice[]> {
  const params = projectId ? `?project_id=${projectId}` : ''
  const response = await fetch(`${API_BASE_URL}/flutter/devices${params}`)
  return handleResponse<FlutterDevice[]>(response)
}

export async function startFlutterRun(
  deviceId: string,
  projectId: string,
  appId?: string,
  runMode: 'debug' | 'profile' | 'release' = 'debug'
): Promise<{ status: string; device: string; project_id: string }> {
  const response = await fetch(`${API_BASE_URL}/flutter/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      device: deviceId,
      project_id: projectId,
      app_id: appId,
      run_mode: runMode,
    }),
  })

  return handleResponse<{ status: string; device: string; project_id: string }>(response)
}

export async function stopFlutterRun(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/flutter/stop`, {
    method: 'POST',
  })

  return handleResponse<{ status: string }>(response)
}

export async function hotReload(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/flutter/hot-reload`, {
    method: 'POST',
  })

  return handleResponse<{ status: string }>(response)
}

export async function hotRestart(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/flutter/hot-restart`, {
    method: 'POST',
  })

  return handleResponse<{ status: string }>(response)
}

export async function getFlutterStatus(): Promise<FlutterRunStatus> {
  const response = await fetch(`${API_BASE_URL}/flutter/status`)
  return handleResponse<FlutterRunStatus>(response)
}

export async function getFlutterLogs(): Promise<LogEntry[]> {
  const response = await fetch(`${API_BASE_URL}/flutter/logs`)
  return handleResponse<LogEntry[]>(response)
}

// Flutter Clean
export async function flutterClean(projectId: string): Promise<{ status: string; message: string; output?: string }> {
  const response = await fetch(`${API_BASE_URL}/flutter/clean`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ project_id: projectId }),
  })
  return handleResponse<{ status: string; message: string; output?: string }>(response)
}

// Flutter Clean Batch (multiple projects)
export interface CleanBatchResult {
  project_id: string
  project_name: string
  status: 'success' | 'error'
  message: string
}

export async function flutterCleanBatch(projectIds: string[]): Promise<{ results: CleanBatchResult[] }> {
  const response = await fetch(`${API_BASE_URL}/flutter/clean-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ project_ids: projectIds }),
  })
  return handleResponse<{ results: CleanBatchResult[] }>(response)
}

// Flutter Project Info
import type { ProjectInfo } from '@/types'

export async function getProjectInfo(projectId: string): Promise<ProjectInfo> {
  const response = await fetch(`${API_BASE_URL}/flutter/project-info?project_id=${projectId}`)
  return handleResponse<ProjectInfo>(response)
}

// Directory Browser API
export interface DirectoryEntry {
  name: string
  path: string
  is_flutter_project: boolean
}

export interface BrowseResult {
  current_path: string
  parent_path: string | null
  is_flutter_project: boolean
  directories: DirectoryEntry[]
}

export async function browseDirectory(path?: string): Promise<BrowseResult> {
  const params = path ? `?path=${encodeURIComponent(path)}` : ''
  const response = await fetch(`${API_BASE_URL}/browse${params}`)
  return handleResponse<BrowseResult>(response)
}

// Build History API
export async function getBuildHistory(
  projectId: string,
  appId: string,
  limit: number = 20
): Promise<BuildHistoryRecord[]> {
  const response = await fetch(
    `${API_BASE_URL}/projects/${projectId}/apps/${appId}/builds?limit=${limit}`
  )
  return handleResponse<BuildHistoryRecord[]>(response)
}

export async function deleteBuild(
  projectId: string,
  appId: string,
  buildId: string,
  deleteFile: boolean = true
): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/projects/${projectId}/apps/${appId}/builds/${buildId}?delete_file=${deleteFile}`,
    {
      method: 'DELETE',
    }
  )
  return handleResponse<{ message: string }>(response)
}

// System Info API
export interface SystemInfo {
  app_version: string
  backend: {
    python: string
    flask: string
    socketio: string
  }
  system: {
    os: string
    os_version: string
    architecture: string
    hostname: string
  }
  flutter: {
    version: string | null
    channel: string | null
    dart: string | null
  } | null
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const response = await fetch(`${API_BASE_URL}/system-info`)
  return handleResponse<SystemInfo>(response)
}

// Steps API - Get available workflow step types
export async function fetchAvailableSteps(): Promise<StepType[]> {
  const response = await fetch(`${API_BASE_URL}/steps`)
  return handleResponse<StepType[]>(response)
}
