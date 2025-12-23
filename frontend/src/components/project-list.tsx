import { useState } from 'react'
import { FolderOpen, Plus, Trash2, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useSidebar,
  SidebarSection,
  SidebarHeader,
  SidebarContent,
} from '@/components/sidebar'
import type { Project } from '@/types'

interface ProjectListProps {
  projects: Project[]
  selectedProject: Project | null
  isLoading: boolean
  onSelectProject: (project: Project) => void
  onAddProject: () => void
  onDeleteProject: (project: Project) => void
}

export function ProjectList({
  projects,
  selectedProject,
  isLoading,
  onSelectProject,
  onAddProject,
  onDeleteProject,
}: ProjectListProps) {
  const { isCollapsed } = useSidebar()
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)

  return (
    <SidebarSection>
      <SidebarHeader
        icon={<FolderOpen className="h-4 w-4" />}
        title="Projects"
        action={
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onAddProject}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        }
      />

      <SidebarContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner className="h-4 w-4" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState isCollapsed={isCollapsed} onAddProject={onAddProject} />
        ) : (
          <div className="space-y-0.5">
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isSelected={selectedProject?.id === project.id}
                isHovered={hoveredProject === project.id}
                isCollapsed={isCollapsed}
                onClick={() => onSelectProject(project)}
                onMouseEnter={() => setHoveredProject(project.id)}
                onMouseLeave={() => setHoveredProject(null)}
                onDelete={() => onDeleteProject(project)}
              />
            ))}
          </div>
        )}
      </SidebarContent>
    </SidebarSection>
  )
}

interface EmptyStateProps {
  isCollapsed: boolean
  onAddProject: () => void
}

function EmptyState({ isCollapsed, onAddProject }: EmptyStateProps) {
  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-10"
              onClick={onAddProject}
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Add project</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="text-center py-6 px-2">
      <p className="text-xs text-muted-foreground mb-2">No projects</p>
      <Button variant="ghost" size="sm" onClick={onAddProject} className="h-7 text-xs">
        <Plus className="h-3 w-3 mr-1" />
        Add Project
      </Button>
    </div>
  )
}

interface ProjectItemProps {
  project: Project
  isSelected: boolean
  isHovered: boolean
  isCollapsed: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onDelete: () => void
}

function ProjectItem({
  project,
  isSelected,
  isHovered,
  isCollapsed,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDelete,
}: ProjectItemProps) {
  const initial = project.name.charAt(0).toUpperCase()

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center justify-center h-10 rounded-md transition-colors',
                isSelected
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
              onClick={onClick}
            >
              <span
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {initial}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{project.name}</p>
            <p className="text-xs text-muted-foreground">{project.path}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <button
      className={cn(
        'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors text-left group',
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-muted/50'
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Avatar */}
      <span
        className={cn(
          'w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium shrink-0',
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {initial}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{project.name}</p>
          {project.is_cloned && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-500 font-medium">
              <GitBranch className="h-3 w-3" />
              Cloned
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {getShortPath(project.path)}
        </p>
      </div>

      {/* Delete button */}
      {isHovered && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
    </button>
  )
}

function getShortPath(path: string): string {
  const parts = path.split('/')
  if (parts.length <= 2) return path
  return `.../${parts.slice(-2).join('/')}`
}
