import { create } from 'zustand'
import type { Project, App, LogEntry, BuildResult, BuildState, FlutterRunState, FlutterDevice } from '@/types'

interface AppState {
  // Project state
  projects: Project[]
  selectedProject: Project | null
  isLoadingProjects: boolean

  // App state
  apps: App[]
  selectedApp: App | null
  isLoadingApps: boolean

  // Build state
  build: BuildState

  // Flutter Run state
  flutterRun: FlutterRunState

  // Device state (cached across tab switches)
  devices: FlutterDevice[]
  selectedDevice: string | null
  isLoadingDevices: boolean
  devicesFetchedForProject: string | null  // Track which project devices were fetched for

  // Socket state
  socketConnected: boolean

  // Project actions
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (projectId: string, project: Project) => void
  removeProject: (projectId: string) => void
  selectProject: (project: Project | null) => void
  setLoadingProjects: (loading: boolean) => void

  // App actions
  setApps: (apps: App[]) => void
  addApp: (app: App) => void
  updateApp: (appId: string, app: App) => void
  removeApp: (appId: string) => void
  selectApp: (app: App | null) => void
  setLoadingApps: (loading: boolean) => void

  // Build actions
  startBuild: (buildId: string) => void
  restoreBuildState: (buildId: string, logs: LogEntry[]) => void
  addBuildLog: (log: LogEntry) => void
  setBuildResult: (result: BuildResult) => void
  setBuildError: (error: string) => void
  clearBuild: () => void
  clearBuildLogs: () => void
  stopBuild: () => void

  // Flutter Run actions
  setFlutterRunning: (isRunning: boolean, device: string | null) => void
  addRunLog: (log: LogEntry) => void
  setRunError: (error: string | null) => void
  clearRunLogs: () => void

  // Device actions
  setDevices: (devices: FlutterDevice[]) => void
  setSelectedDevice: (device: string | null) => void
  setIsLoadingDevices: (loading: boolean) => void
  setDevicesFetchedForProject: (projectId: string | null) => void
  clearDeviceCache: () => void

  // Socket actions
  setSocketConnected: (connected: boolean) => void
}

const initialBuildState: BuildState = {
  isBuilding: false,
  buildId: null,
  logs: [],
  result: null,
  error: null,
}

const initialFlutterRunState: FlutterRunState = {
  isRunning: false,
  device: null,
  logs: [],
  error: null,
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  projects: [],
  selectedProject: null,
  isLoadingProjects: false,
  apps: [],
  selectedApp: null,
  isLoadingApps: false,
  build: initialBuildState,
  flutterRun: initialFlutterRunState,
  devices: [],
  selectedDevice: null,
  isLoadingDevices: false,
  devicesFetchedForProject: null,
  socketConnected: false,

  // Project actions
  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),

  updateProject: (projectId, updatedProject) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? updatedProject : p
      ),
      selectedProject:
        state.selectedProject?.id === projectId
          ? updatedProject
          : state.selectedProject,
    })),

  removeProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      selectedProject:
        state.selectedProject?.id === projectId ? null : state.selectedProject,
      // Also clear apps if the deleted project was selected
      apps: state.selectedProject?.id === projectId ? [] : state.apps,
      selectedApp: state.selectedProject?.id === projectId ? null : state.selectedApp,
    })),

  selectProject: (project) =>
    set({
      selectedProject: project,
      // Clear app selection when switching projects
      selectedApp: null,
      apps: [],
    }),

  setLoadingProjects: (loading) => set({ isLoadingProjects: loading }),

  // App actions
  setApps: (apps) => set({ apps }),

  addApp: (app) =>
    set((state) => ({ apps: [...state.apps, app] })),

  updateApp: (appId, updatedApp) =>
    set((state) => ({
      apps: state.apps.map((a) =>
        a.id === appId ? updatedApp : a
      ),
      selectedApp:
        state.selectedApp?.id === appId
          ? updatedApp
          : state.selectedApp,
    })),

  removeApp: (appId) =>
    set((state) => ({
      apps: state.apps.filter((a) => a.id !== appId),
      selectedApp:
        state.selectedApp?.id === appId ? null : state.selectedApp,
    })),

  selectApp: (app) => set({ selectedApp: app }),

  setLoadingApps: (loading) => set({ isLoadingApps: loading }),

  // Build actions
  startBuild: (buildId) =>
    set({
      build: {
        ...initialBuildState,
        isBuilding: true,
        buildId,
      },
    }),

  restoreBuildState: (buildId, logs) =>
    set({
      build: {
        isBuilding: true,
        buildId,
        logs,
        result: null,
        error: null,
      },
    }),

  addBuildLog: (log) =>
    set((state) => ({
      build: {
        ...state.build,
        logs: [...state.build.logs, log],
      },
    })),

  setBuildResult: (result) =>
    set((state) => ({
      build: {
        ...state.build,
        isBuilding: false,
        result,
      },
    })),

  setBuildError: (error) =>
    set((state) => ({
      build: {
        ...state.build,
        isBuilding: false,
        error,
      },
    })),

  clearBuild: () => set({ build: initialBuildState }),

  clearBuildLogs: () =>
    set((state) => ({
      build: {
        ...state.build,
        logs: [],
        result: null,
        error: null,
      },
    })),

  stopBuild: () =>
    set((state) => ({
      build: {
        ...state.build,
        isBuilding: false,
      },
    })),

  // Flutter Run actions
  setFlutterRunning: (isRunning, device) =>
    set((state) => ({
      flutterRun: {
        ...state.flutterRun,
        isRunning,
        device,
        error: null,
      },
    })),

  addRunLog: (log) =>
    set((state) => ({
      flutterRun: {
        ...state.flutterRun,
        logs: [...state.flutterRun.logs, log],
      },
    })),

  setRunError: (error) =>
    set((state) => ({
      flutterRun: {
        ...state.flutterRun,
        error,
        isRunning: false,
      },
    })),

  clearRunLogs: () =>
    set((state) => ({
      flutterRun: {
        ...state.flutterRun,
        logs: [],
      },
    })),

  // Device actions
  setDevices: (devices) => set({ devices }),

  setSelectedDevice: (device) => set({ selectedDevice: device }),

  setIsLoadingDevices: (loading) => set({ isLoadingDevices: loading }),

  setDevicesFetchedForProject: (projectId) => set({ devicesFetchedForProject: projectId }),

  clearDeviceCache: () =>
    set({
      devices: [],
      selectedDevice: null,
      devicesFetchedForProject: null,
    }),

  // Socket actions
  setSocketConnected: (connected) => set({ socketConnected: connected }),
}))
