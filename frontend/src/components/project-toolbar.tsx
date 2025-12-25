import { useState } from 'react'
import { FolderOpen, Trash2, Info, Loader2, X, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectInfoDialog } from '@/components/project-info-dialog'
import { flutterClean, flutterCleanBatch } from '@/services/api'
import { useToast } from '@/components/ui/toast'
import type { Project } from '@/types'

interface ProjectToolbarProps {
    project: Project | null
    selectedProjectIds: Set<string>
    projects: Project[]
    onClearSelection: () => void
}

export function ProjectToolbar({ 
    project, 
    selectedProjectIds, 
    projects,
    onClearSelection 
}: ProjectToolbarProps) {
    const [isCleaning, setIsCleaning] = useState(false)
    const [cleanProgress, setCleanProgress] = useState<{ current: number; total: number } | null>(null)
    const [infoDialogOpen, setInfoDialogOpen] = useState(false)
    const { addToast } = useToast()

    const isMultiSelect = selectedProjectIds.size > 1
    const selectedCount = selectedProjectIds.size

    // Don't render if no project selected and no multi-select
    if (!project && selectedCount === 0) {
        return null
    }

    const handleCleanSingle = async () => {
        if (!project) return
        setIsCleaning(true)
        try {
            const result = await flutterClean(project.id)
            if (result.status === 'success') {
                addToast('Flutter clean completed successfully', 'success')
            } else {
                addToast(result.message || 'Flutter clean failed', 'error')
            }
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Flutter clean failed',
                'error'
            )
        } finally {
            setIsCleaning(false)
        }
    }

    const handleCleanBatch = async () => {
        const projectIds = Array.from(selectedProjectIds)
        setIsCleaning(true)
        setCleanProgress({ current: 0, total: projectIds.length })
        
        try {
            const response = await flutterCleanBatch(projectIds)
            const results = response.results
            
            const successCount = results.filter(r => r.status === 'success').length
            const failCount = results.filter(r => r.status === 'error').length
            
            if (failCount === 0) {
                addToast(`Cleaned ${successCount} projects successfully`, 'success')
            } else if (successCount === 0) {
                addToast(`Failed to clean all ${failCount} projects`, 'error')
            } else {
                addToast(`Cleaned ${successCount} projects, ${failCount} failed`, 'warning')
            }
            
            // Clear selection after batch operation
            onClearSelection()
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Batch clean failed',
                'error'
            )
        } finally {
            setIsCleaning(false)
            setCleanProgress(null)
        }
    }

    // Multi-select mode UI
    if (isMultiSelect) {
        const selectedNames = projects
            .filter(p => selectedProjectIds.has(p.id))
            .map(p => p.name)
            .slice(0, 3)
            .join(', ')
        const moreCount = selectedCount - 3

        return (
            <div className="border-b bg-primary/5 px-4 py-2 shrink-0">
                <div className="flex items-center justify-between">
                    {/* Selection Info */}
                    <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">
                            {selectedCount} projects selected
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {selectedNames}{moreCount > 0 ? `, +${moreCount} more` : ''}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCleanBatch}
                            disabled={isCleaning}
                            className="gap-1.5"
                        >
                            {isCleaning ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                            )}
                            {isCleaning 
                                ? cleanProgress 
                                    ? `Cleaning...` 
                                    : 'Cleaning...'
                                : `Clean ${selectedCount} Projects`
                            }
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearSelection}
                            disabled={isCleaning}
                            className="gap-1.5"
                        >
                            <X className="h-3.5 w-3.5" />
                            Clear
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Single project mode UI (original behavior)
    if (!project) {
        return null
    }

    return (
        <>
            <div className="border-b bg-muted/30 px-4 py-2 shrink-0">
                <div className="flex items-center justify-between">
                    {/* Project Info */}
                    <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{project.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {project.path}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCleanSingle}
                            disabled={isCleaning}
                            className="gap-1.5"
                        >
                            {isCleaning ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                            )}
                            {isCleaning ? 'Cleaning...' : 'Clean'}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInfoDialogOpen(true)}
                            className="gap-1.5"
                        >
                            <Info className="h-3.5 w-3.5" />
                            Info
                        </Button>
                    </div>
                </div>
            </div>

            <ProjectInfoDialog
                open={infoDialogOpen}
                onOpenChange={setInfoDialogOpen}
                project={project}
            />
        </>
    )
}
