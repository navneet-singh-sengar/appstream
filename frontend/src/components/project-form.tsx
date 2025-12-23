import { useState, useEffect } from 'react'
import { FolderOpen, Search, GitBranch, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DirectoryBrowser } from '@/components/directory-browser'
import { getSocket } from '@/services/socket'
import type { Project, ProjectFormData } from '@/types'

interface CloneProgress {
  stage: 'cloning' | 'validating' | 'registering' | 'complete' | 'error'
  message: string
  progress: number | null
  size_info?: string | null
}

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  onSubmit: (data: ProjectFormData) => Promise<void>
  mode: 'add' | 'edit'
}

type SourceType = 'local' | 'repository'

export function ProjectForm({
  open,
  onOpenChange,
  project,
  onSubmit,
  mode,
}: ProjectFormProps) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('local')
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [destinationPath, setDestinationPath] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [browserOpen, setBrowserOpen] = useState(false)
  const [destinationBrowserOpen, setDestinationBrowserOpen] = useState(false)
  const [cloneProgress, setCloneProgress] = useState<CloneProgress | null>(null)

  // Reset form when dialog opens/closes or project changes
  useEffect(() => {
    if (open) {
      if (project && mode === 'edit') {
        setName(project.name)
        setPath(project.path)
        setSourceType('local')
      } else {
        setName('')
        setPath('')
        setSourceType('local')
        setRepositoryUrl('')
        setDestinationPath('')
      }
      setError(null)
      setCloneProgress(null)
    }
  }, [open, project, mode])

  // Listen for clone progress events
  useEffect(() => {
    const socket = getSocket()

    function handleCloneProgress(data: CloneProgress) {
      setCloneProgress(data)
    }

    socket.on('clone_progress', handleCloneProgress)

    return () => {
      socket.off('clone_progress', handleCloneProgress)
    }
  }, [])

  // Auto-fill name from repository URL
  useEffect(() => {
    if (sourceType === 'repository' && repositoryUrl && !name.trim()) {
      const repoName = repositoryUrl.replace(/\/$/, '').split('/').pop()?.replace('.git', '') || ''
      if (repoName) {
        const titleName = repoName
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
        setName(titleName)
      }
    }
  }, [repositoryUrl, sourceType, name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    if (sourceType === 'local') {
      if (!path.trim()) {
        setError('Project path is required')
        return
      }
    } else {
      if (!repositoryUrl.trim()) {
        setError('Repository URL is required')
        return
      }
    }

    setIsSubmitting(true)

    try {
      if (sourceType === 'local') {
        await onSubmit({
          name: name.trim(),
          path: path.trim(),
          sourceType: 'local',
        })
      } else {
        await onSubmit({
          name: name.trim(),
          path: '', // Will be set by backend after cloning
          sourceType: 'repository',
          repositoryUrl: repositoryUrl.trim(),
          destinationPath: destinationPath.trim() || undefined,
        })
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePathSelect = (selectedPath: string) => {
    setPath(selectedPath)

    // Auto-fill name from folder name if empty
    if (!name.trim()) {
      const folderName = selectedPath.split('/').filter(Boolean).pop() || ''
      // Convert folder name to title case
      const titleName = folderName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
      setName(titleName)
    }
  }

  const handleDestinationSelect = (selectedPath: string) => {
    setDestinationPath(selectedPath)
  }

  // Don't show tabs in edit mode
  const showSourceTabs = mode === 'add'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {sourceType === 'repository' ? (
                <GitBranch className="h-5 w-5" />
              ) : (
                <FolderOpen className="h-5 w-5" />
              )}
              {mode === 'add' ? 'Add Flutter Project' : 'Edit Project'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Source Type Tabs */}
            {showSourceTabs && (
              <div className="flex rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setSourceType('local')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${sourceType === 'local'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <FolderOpen className="h-4 w-4" />
                  Local Folder
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('repository')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${sourceType === 'repository'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <GitBranch className="h-4 w-4" />
                  Clone Repository
                </button>
              </div>
            )}

            {/* Local Folder Mode */}
            {sourceType === 'local' && (
              <div className="space-y-2">
                <Label htmlFor="path">Project Location</Label>
                <div className="flex gap-2">
                  <Input
                    id="path"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="Select a Flutter project folder..."
                    disabled={isSubmitting}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBrowserOpen(true)}
                    disabled={isSubmitting}
                  >
                    <Search className="h-4 w-4" />
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a folder containing pubspec.yaml
                </p>
              </div>
            )}

            {/* Clone Repository Mode */}
            {sourceType === 'repository' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="repositoryUrl">Repository URL</Label>
                  <Input
                    id="repositoryUrl"
                    value={repositoryUrl}
                    onChange={(e) => setRepositoryUrl(e.target.value)}
                    placeholder="https://github.com/flutter/gallery.git"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Git repository URL (HTTPS or SSH)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destinationPath">
                    Destination Folder <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="destinationPath"
                      value={destinationPath}
                      onChange={(e) => setDestinationPath(e.target.value)}
                      placeholder="Default: projects folder"
                      disabled={isSubmitting}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDestinationBrowserOpen(true)}
                      disabled={isSubmitting}
                    >
                      <Search className="h-4 w-4" />
                      Browse
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Where to clone the repository
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Flutter App"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                A friendly name for this project
              </p>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Clone Progress Indicator */}
            {isSubmitting && sourceType === 'repository' && cloneProgress && (
              <div className="space-y-3 p-4 bg-muted/40 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">{cloneProgress.message}</span>
                  </div>
                  {cloneProgress.progress !== null && (
                    <span className="text-sm font-medium text-muted-foreground">
                      {cloneProgress.progress}%
                    </span>
                  )}
                </div>

                {cloneProgress.progress !== null && (
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${cloneProgress.progress}%` }}
                    />
                  </div>
                )}

                {cloneProgress.size_info && (
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground font-mono bg-background/80 px-2 py-1 rounded border shadow-sm">
                      {cloneProgress.size_info}
                    </span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (sourceType === 'local' ? !path : !repositoryUrl)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {sourceType === 'repository' ? 'Cloning...' : 'Saving...'}
                  </>
                ) : mode === 'add' ? (
                  sourceType === 'repository' ? 'Clone & Add Project' : 'Add Project'
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Directory Browser Modal for local path */}
      <DirectoryBrowser
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        onSelect={handlePathSelect}
        initialPath={path || undefined}
      />

      {/* Directory Browser Modal for destination path */}
      <DirectoryBrowser
        open={destinationBrowserOpen}
        onOpenChange={setDestinationBrowserOpen}
        onSelect={handleDestinationSelect}
        initialPath={destinationPath || undefined}
        allowAnyDirectory={true}
      />
    </>
  )
}
