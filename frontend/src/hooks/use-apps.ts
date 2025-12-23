import { useCallback, useEffect } from 'react'
import { useStore } from '@/store'
import * as api from '@/services/api'
import type { App, AppFormData } from '@/types'

export function useApps() {
    const {
        apps,
        selectedApp,
        selectedProject,
        isLoadingApps,
        setApps,
        removeApp,
        selectApp,
        setLoadingApps,
    } = useStore()

    const loadApps = useCallback(async (projectId?: string) => {
        const targetProjectId = projectId || selectedProject?.id
        
        if (!targetProjectId) {
            setApps([])
            return
        }
        
        setLoadingApps(true)
        try {
            const data = await api.fetchApps(targetProjectId)
            setApps(data)
        } catch (error) {
            console.error('Failed to load apps:', error)
            setApps([])
        } finally {
            setLoadingApps(false)
        }
    }, [selectedProject?.id, setApps, setLoadingApps])

    const createApp = useCallback(
        async (data: AppFormData): Promise<string> => {
            if (!selectedProject) {
                throw new Error('No project selected')
            }
            const result = await api.createApp(selectedProject.id, data)
            await loadApps(selectedProject.id) // Reload to get the full app data
            return result.id
        },
        [selectedProject, loadApps]
    )

    const editApp = useCallback(
        async (appId: string, data: Partial<App> & { androidAppIcon?: File }): Promise<void> => {
            await api.updateApp(appId, data)
            // Reload apps to get updated data
            if (selectedProject) {
                await loadApps(selectedProject.id)
            }
        },
        [selectedProject, loadApps]
    )

    const deleteApp = useCallback(
        async (appId: string): Promise<void> => {
            await api.deleteApp(appId)
            removeApp(appId)
        },
        [removeApp]
    )

    const selectAppById = useCallback(
        (appId: string | undefined) => {
            if (!appId) {
                selectApp(null)
                return
            }
            const app = apps.find((a) => a.id === appId)
            selectApp(app ?? null)
        },
        [apps, selectApp]
    )

    // Load apps when selected project changes
    useEffect(() => {
        if (selectedProject) {
            loadApps(selectedProject.id)
        } else {
            setApps([])
        }
    }, [selectedProject, loadApps, setApps])

    return {
        apps,
        selectedApp,
        isLoadingApps,
        loadApps,
        createApp,
        editApp,
        deleteApp,
        selectApp,
        selectAppById,
    }
}
