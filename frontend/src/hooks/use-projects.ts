import { useCallback, useEffect } from 'react'
import { useStore } from '@/store'
import * as api from '@/services/api'
import type { Project, ProjectFormData } from '@/types'

export function useProjects() {
  const {
    projects,
    selectedProject,
    isLoadingProjects,
    setProjects,
    addProject,
    updateProject: updateProjectInStore,
    removeProject,
    selectProject,
    setLoadingProjects,
  } = useStore()

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const data = await api.fetchProjects()
      setProjects(data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }, [setProjects, setLoadingProjects])

  const createProject = useCallback(
    async (data: ProjectFormData): Promise<Project> => {
      // Check if this is a clone operation
      if (data.sourceType === 'repository' && data.repositoryUrl) {
        const result = await api.cloneProject({
          name: data.name,
          repositoryUrl: data.repositoryUrl,
          destinationPath: data.destinationPath,
        })
        addProject(result.project)
        return result.project
      }

      // Otherwise, create from local path
      const result = await api.createProject(data)
      addProject(result.project)
      return result.project
    },
    [addProject]
  )

  const editProject = useCallback(
    async (projectId: string, data: Partial<ProjectFormData>): Promise<void> => {
      await api.updateProject(projectId, data)
      // Fetch updated project
      const updatedProject = await api.fetchProject(projectId)
      updateProjectInStore(projectId, updatedProject)
    },
    [updateProjectInStore]
  )

  const deleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      await api.deleteProject(projectId)
      removeProject(projectId)
    },
    [removeProject]
  )

  const selectProjectById = useCallback(
    (projectId: string | undefined) => {
      if (!projectId) {
        selectProject(null)
        return
      }
      const project = projects.find((p) => p.id === projectId)
      selectProject(project ?? null)
    },
    [projects, selectProject]
  )

  // Load projects on mount
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    projects,
    selectedProject,
    isLoadingProjects,
    loadProjects,
    createProject,
    editProject,
    deleteProject,
    selectProject,
    selectProjectById,
  }
}

