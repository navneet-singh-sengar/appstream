import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Navbar } from './navbar'
import { ProjectToolbar } from '@/components/project-toolbar'
import { ProjectList } from '@/components/project-list'
import { ProjectForm } from '@/components/project-form'
import { ProjectInfoDialog } from '@/components/project-info-dialog'
import { AppList } from '@/components/app-list'
import { AppForm } from '@/components/app-form'
import { BuildConsole, WelcomeMessage } from '@/components/build-console'
import { FlutterRunPanel } from '@/components/flutter-run-panel'
import { BuildHistoryPanel } from '@/components/build-history-panel'
import { ConsoleTabs, type ConsoleTab } from '@/components/console-tabs'
import { Sidebar, SidebarProvider } from '@/components/sidebar'
import { useProjects } from '@/hooks/use-projects'
import { useApps } from '@/hooks/use-apps'
import { useBuild } from '@/hooks/use-build'
import { useSocket } from '@/hooks/use-socket'
import { useTheme } from '@/hooks/use-theme'
import { useStore } from '@/store'
import { getProjectPlatforms, deleteProject as apiDeleteProject } from '@/services/api'
import type { Project, ProjectFormData, App, AppFormData, Platform, BuildType, BuildOutputType } from '@/types'

type ProjectAction = 'remove' | 'delete'

export function AppLayout() {
    const { projectId, appId } = useParams<{ projectId?: string; appId?: string }>()
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { isDark, toggleTheme } = useTheme()

    // Project form state
    const [projectFormOpen, setProjectFormOpen] = useState(false)
    const [projectFormMode, setProjectFormMode] = useState<'add' | 'edit'>('add')
    const [projectDialogOpen, setProjectDialogOpen] = useState(false)
    const [projectToAction, setProjectToAction] = useState<Project | null>(null)
    const [projectAction, setProjectAction] = useState<ProjectAction>('remove')

    // App form state
    const [appFormOpen, setAppFormOpen] = useState(false)
    const [appFormMode, setAppFormMode] = useState<'add' | 'edit'>('add')
    const [editingApp, setEditingApp] = useState<App | null>(null)
    const [deleteAppDialogOpen, setDeleteAppDialogOpen] = useState(false)
    const [projectPlatforms, setProjectPlatforms] = useState<Platform[]>([])

    const [activeTab, setActiveTab] = useState<ConsoleTab>('build')

    // Multi-select state for projects
    const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set())

    // Project info dialog state
    const [projectInfoOpen, setProjectInfoOpen] = useState(false)
    const [projectForInfo, setProjectForInfo] = useState<Project | null>(null)

    useSocket()

    const {
        projects,
        selectedProject,
        isLoadingProjects,
        createProject,
        loadProjects,
        selectProjectById,
    } = useProjects()

    const {
        apps,
        selectedApp,
        isLoadingApps,
        createApp,
        editApp,
        deleteApp,
        selectAppById,
    } = useApps()

    const { build, buildApp, stopBuild, clearBuildLogs } = useBuild()
    const socketConnected = useStore((state) => state.socketConnected)

    // Sync URL params with selected project and app
    useEffect(() => {
        if (!isLoadingProjects && projectId) {
            selectProjectById(projectId)
        }
    }, [projectId, projects, isLoadingProjects, selectProjectById])

    useEffect(() => {
        if (!isLoadingApps && appId && selectedProject) {
            selectAppById(appId)
        }
    }, [appId, apps, isLoadingApps, selectedProject, selectAppById])

    // Navigate to project URL when selecting
    const handleSelectProject = useCallback(
        (project: Project) => {
            navigate(`/project/${project.id}`)
        },
        [navigate]
    )

    // Navigate to app URL when selecting
    const handleSelectApp = useCallback(
        (app: App) => {
            if (selectedProject) {
                navigate(`/project/${selectedProject.id}/app/${app.id}`)
            }
        },
        [selectedProject, navigate]
    )

    // Clear multi-select when navigating to a project
    const handleClearSelection = useCallback(() => {
        setSelectedProjectIds(new Set())
    }, [])

    // Show project info dialog
    const handleShowProjectInfo = useCallback((project: Project) => {
        setProjectForInfo(project)
        setProjectInfoOpen(true)
    }, [])

    // Project handlers
    const handleAddProject = useCallback(() => {
        setProjectFormMode('add')
        setProjectFormOpen(true)
    }, [])

    // Remove project from list (keeps folder on disk)
    const handleRemoveProject = useCallback((project: Project) => {
        setProjectToAction(project)
        setProjectAction('remove')
        setProjectDialogOpen(true)
    }, [])

    // Delete project (removes folder from disk)
    const handleDeleteProject = useCallback((project: Project) => {
        setProjectToAction(project)
        setProjectAction('delete')
        setProjectDialogOpen(true)
    }, [])

    const confirmProjectAction = useCallback(async () => {
        if (!projectToAction) return

        try {
            const deleteFolder = projectAction === 'delete'
            await apiDeleteProject(projectToAction.id, deleteFolder)
            await loadProjects()
            navigate('/')
            
            if (deleteFolder) {
                addToast('Project deleted from disk', 'success')
            } else {
                addToast('Project removed from workspace', 'success')
            }
        } catch {
            addToast(`Failed to ${projectAction} project`, 'error')
        }
        setProjectToAction(null)
    }, [projectToAction, projectAction, loadProjects, navigate, addToast])

    const handleProjectFormSubmit = useCallback(
        async (data: ProjectFormData) => {
            try {
                const newProject = await createProject(data)
                navigate(`/project/${newProject.id}`)
                addToast('Project added successfully!', 'success')
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Operation failed'
                addToast(message, 'error')
                throw error
            }
        },
        [createProject, navigate, addToast]
    )

    // App handlers
    const handleAddApp = useCallback(async () => {
        if (!selectedProject) {
            addToast('Please select a project first', 'warning')
            return
        }

        // Fetch project platforms to pre-select in the form
        try {
            const result = await getProjectPlatforms(selectedProject.id)
            setProjectPlatforms(result.platforms)
        } catch {
            setProjectPlatforms([])
        }

        setAppFormMode('add')
        setEditingApp(null)
        setAppFormOpen(true)
    }, [selectedProject, addToast])

    const handleEditApp = useCallback((app: App) => {
        setAppFormMode('edit')
        setEditingApp(app)
        setAppFormOpen(true)
    }, [])

    const handleDeleteApp = useCallback((app: App) => {
        selectAppById(app.id) // Ensure it's selected for the confirmation dialog message
        setDeleteAppDialogOpen(true)
    }, [selectAppById])

    const confirmDeleteApp = useCallback(async () => {
        if (!selectedApp || !selectedProject) return

        try {
            await deleteApp(selectedApp.id)
            navigate(`/project/${selectedProject.id}`)
            addToast('App deleted successfully', 'success')
        } catch {
            addToast('Failed to delete app', 'error')
        }
    }, [selectedApp, selectedProject, deleteApp, navigate, addToast])

    const handleAppFormSubmit = useCallback(
        async (data: AppFormData) => {
            try {
                if (appFormMode === 'add') {
                    const newAppId = await createApp(data)
                    if (selectedProject) {
                        navigate(`/project/${selectedProject.id}/app/${newAppId}`)
                    }
                    addToast('App added successfully!', 'success')
                } else if (editingApp) {
                    await editApp(editingApp.id, {
                        appName: data.appName,
                        packageId: data.packageId,
                        platforms: data.platforms,
                        logoUrl: data.logoUrl,
                        buildSettings: data.buildSettings,
                    })
                    addToast('App updated successfully!', 'success')
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Operation failed'
                addToast(message, 'error')
                throw error
            }
        },
        [appFormMode, editingApp, selectedProject, createApp, editApp, navigate, addToast]
    )

    // Build handlers
    const handleBuild = useCallback(
        async (platform: Platform, buildType: BuildType, outputType: BuildOutputType) => {
            if (!selectedApp) return

            try {
                await buildApp(selectedApp.id, platform, buildType, outputType)
                addToast('Build completed successfully!', 'success')
            } catch {
                addToast('Build failed!', 'error')
            }
        },
        [selectedApp, buildApp, addToast]
    )

    const handleStopBuild = useCallback(async () => {
        try {
            await stopBuild()
            addToast('Build stopped', 'info')
        } catch {
            addToast('Failed to stop build', 'error')
        }
    }, [stopBuild, addToast])

    // Get dialog content based on action
    const getProjectDialogContent = () => {
        if (!projectToAction) return { title: '', description: '', confirmLabel: '', requireConfirmation: undefined }

        if (projectAction === 'delete') {
            return {
                title: 'Delete Project',
                description: `Are you sure you want to permanently delete "${projectToAction.name}"? This will delete the project folder from your disk and remove all app configurations. This action cannot be undone.`,
                confirmLabel: 'Delete',
                requireConfirmation: 'DELETE',
            }
        }

        // Remove action
        return {
            title: 'Remove Project',
            description: `Remove "${projectToAction.name}" from your workspace? The project folder will remain on your disk, but the app configurations for this project will be deleted.`,
            confirmLabel: 'Remove',
            requireConfirmation: undefined,
        }
    }

    const dialogContent = getProjectDialogContent()

    return (
        <SidebarProvider>
            <div className="h-screen flex flex-col overflow-hidden bg-background">
                <Navbar isDark={isDark} onToggleTheme={toggleTheme} />
                
                {/* Project Toolbar - Shows when project is selected or multi-select mode */}
                <ProjectToolbar 
                    project={selectedProject} 
                    selectedProjectIds={selectedProjectIds}
                    projects={projects}
                    onClearSelection={handleClearSelection}
                />

                {/* Main Content - Flex Layout with Sidebar */}
                <div className="flex-1 min-h-0 flex overflow-hidden">
                    {/* Collapsible Sidebar */}
                    <Sidebar>
                        {/* Projects Section */}
                        <ProjectList
                            projects={projects}
                            selectedProject={selectedProject}
                            selectedProjectIds={selectedProjectIds}
                            isLoading={isLoadingProjects}
                            onSelectProject={handleSelectProject}
                            onAddProject={handleAddProject}
                            onRemoveProject={handleRemoveProject}
                            onDeleteProject={handleDeleteProject}
                            onSelectionChange={setSelectedProjectIds}
                            onShowInfo={handleShowProjectInfo}
                        />

                        {/* Apps Section - Only shown when project is selected */}
                        {selectedProject && (
                            <AppList
                                apps={apps}
                                selectedApp={selectedApp}
                                isLoading={isLoadingApps}
                                onSelectApp={handleSelectApp}
                                onAddApp={handleAddApp}
                                onEditApp={handleEditApp}
                                onDeleteApp={handleDeleteApp}
                            />
                        )}
                    </Sidebar>

                    {/* Main Content Area */}
                    <main className="flex-1 min-w-0 flex flex-col overflow-hidden p-4">
                        <ConsoleTabs activeTab={activeTab} onTabChange={setActiveTab} />

                        {/* Tab Content */}
                        <div className="flex-1 min-h-0 overflow-hidden">
                            {activeTab === 'build' ? (
                                selectedApp ? (
                                    <BuildConsole
                                        selectedApp={selectedApp}
                                        logs={build.logs}
                                        isBuilding={build.isBuilding}
                                        socketConnected={socketConnected}
                                        onBuild={handleBuild}
                                        onStopBuild={handleStopBuild}
                                        onClearLogs={clearBuildLogs}
                                    />
                                ) : (
                                    <WelcomeMessage hasProject={!!selectedProject} />
                                )
                            ) : activeTab === 'run' ? (
                                <FlutterRunPanel socketConnected={socketConnected} />
                            ) : (
                                <BuildHistoryPanel selectedApp={selectedApp} />
                            )}
                        </div>
                    </main>
                </div>

                {/* Project Form Modal */}
                <ProjectForm
                    open={projectFormOpen}
                    onOpenChange={setProjectFormOpen}
                    onSubmit={handleProjectFormSubmit}
                    mode={projectFormMode}
                />

                {/* App Form Modal */}
                <AppForm
                    open={appFormOpen}
                    onOpenChange={setAppFormOpen}
                    app={editingApp}
                    onSubmit={handleAppFormSubmit}
                    mode={appFormMode}
                    defaultPlatforms={projectPlatforms}
                />

                {/* Project Remove/Delete Confirmation Dialog */}
                <ConfirmDialog
                    open={projectDialogOpen}
                    onOpenChange={setProjectDialogOpen}
                    title={dialogContent.title}
                    description={dialogContent.description}
                    confirmLabel={dialogContent.confirmLabel}
                    cancelLabel="Cancel"
                    variant="destructive"
                    onConfirm={confirmProjectAction}
                    requireConfirmation={dialogContent.requireConfirmation}
                />

                {/* Delete App Confirmation Dialog */}
                <ConfirmDialog
                    open={deleteAppDialogOpen}
                    onOpenChange={setDeleteAppDialogOpen}
                    title="Delete App"
                    description={`Are you sure you want to delete "${selectedApp?.appName}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    variant="destructive"
                    onConfirm={confirmDeleteApp}
                />

                {/* Project Info Dialog */}
                {projectForInfo && (
                    <ProjectInfoDialog
                        open={projectInfoOpen}
                        onOpenChange={setProjectInfoOpen}
                        project={projectForInfo}
                    />
                )}
            </div>
        </SidebarProvider>
    )
}
