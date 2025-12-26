import { useState, useCallback } from 'react'
import { FolderOpen, Plus, Trash2, GitBranch, Check, Info, MoreVertical, X, Sparkles } from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
  selectedProjectIds: Set<string>
  isLoading: boolean
  onSelectProject: (project: Project) => void
  onAddProject: () => void
  onRemoveProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
  onSelectionChange: (selectedIds: Set<string>) => void
  onShowInfo: (project: Project) => void
  onClean: (project: Project) => void
  onCleanSelected: () => void
  onRemoveSelected: () => void
  onDeleteSelected: () => void
}

export function ProjectList({
  projects,
  selectedProject,
  selectedProjectIds,
  isLoading,
  onSelectProject,
  onAddProject,
  onRemoveProject,
  onDeleteProject,
  onSelectionChange,
  onShowInfo,
  onClean,
  onCleanSelected,
  onRemoveSelected,
  onDeleteSelected,
}: ProjectListProps) {
  const { isCollapsed } = useSidebar()
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null)

  const isSelectionMode = selectedProjectIds.size > 0
  const selectedCount = selectedProjectIds.size

  const handleCheckboxChange = useCallback((project: Project, index: number, shiftKey: boolean) => {
    const newSelection = new Set(selectedProjectIds)

    if (shiftKey && lastClickedIndex !== null) {
      // Range selection
      const start = Math.min(lastClickedIndex, index)
      const end = Math.max(lastClickedIndex, index)
      for (let i = start; i <= end; i++) {
        newSelection.add(projects[i].id)
      }
    } else {
      // Toggle single selection
      if (newSelection.has(project.id)) {
        newSelection.delete(project.id)
      } else {
        newSelection.add(project.id)
      }
    }

    setLastClickedIndex(index)
    onSelectionChange(newSelection)
  }, [selectedProjectIds, lastClickedIndex, projects, onSelectionChange])

  return (
    <SidebarSection>
      <SidebarHeader
        icon={<FolderOpen className="h-4 w-4" />}
        title="Projects"
        action={
          <div className="flex items-center gap-0.5">
            {/* Add project button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onAddProject}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>

            {/* Batch operations menu - only show when items are selected */}
            {isSelectionMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onCleanSelected}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Clean Selected ({selectedCount})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onRemoveSelected}>
                    <X className="h-4 w-4 mr-2" />
                    Remove Selected ({selectedCount})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={onDeleteSelected}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedCount})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
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
            {projects.map((project, index) => (
              <ProjectItem
                key={project.id}
                project={project}
                index={index}
                isSelected={selectedProject?.id === project.id}
                isChecked={selectedProjectIds.has(project.id)}
                isHovered={hoveredProject === project.id}
                isCollapsed={isCollapsed}
                isSelectionMode={isSelectionMode}
                onClick={() => onSelectProject(project)}
                onMouseEnter={() => setHoveredProject(project.id)}
                onMouseLeave={() => setHoveredProject(null)}
                onRemove={() => onRemoveProject(project)}
                onDelete={() => onDeleteProject(project)}
                onShowInfo={() => onShowInfo(project)}
                onClean={() => onClean(project)}
                onCheckboxChange={(shiftKey) => handleCheckboxChange(project, index, shiftKey)}
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
  index: number
  isSelected: boolean
  isChecked: boolean
  isHovered: boolean
  isCollapsed: boolean
  isSelectionMode: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onRemove: () => void
  onDelete: () => void
  onShowInfo: () => void
  onClean: () => void
  onCheckboxChange: (shiftKey: boolean) => void
}

function ProjectItem({
  project,
  isSelected,
  isChecked,
  isHovered,
  isCollapsed,
  isSelectionMode,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onRemove,
  onDelete,
  onShowInfo,
  onClean,
  onCheckboxChange,
}: ProjectItemProps) {
  const initial = project.name.charAt(0).toUpperCase()
  const showCheckbox = isSelectionMode || isHovered

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
    <div
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left group',
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-muted/50'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Checkbox */}
      <button
        className={cn(
          'w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-all',
          isChecked
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground/30 hover:border-primary',
          !showCheckbox && 'opacity-0'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onCheckboxChange(e.shiftKey)
        }}
      >
        {isChecked && <Check className="h-2.5 w-2.5" />}
      </button>

      {/* Clickable area for navigation */}
      <button
        className="flex-1 flex items-center gap-2.5 min-w-0"
        onClick={onClick}
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
        <div className="flex-1 min-w-0 text-left">
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
      </button>

      {/* Context menu button */}
      {isHovered && !isSelectionMode && (
        <div className="shrink-0 opacity-0 group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onClean}>
                <Sparkles className="h-4 w-4 mr-2" />
                Clean
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowInfo}>
                <Info className="h-4 w-4 mr-2" />
                Info
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRemove}>
                <X className="h-4 w-4 mr-2" />
                Remove from list
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete from disk
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

function getShortPath(path: string): string {
  const parts = path.split('/')
  if (parts.length <= 2) return path
  return `.../${parts.slice(-2).join('/')}`
}
