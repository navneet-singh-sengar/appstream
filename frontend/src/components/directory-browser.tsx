import { useState, useEffect, useCallback } from 'react'
import {
  Folder,
  FolderOpen,
  ChevronUp,
  Check,
  Home,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { browseDirectory, type DirectoryEntry, type BrowseResult } from '@/services/api'

interface DirectoryBrowserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (path: string) => void
  initialPath?: string
  /** If true, allows selecting any directory, not just Flutter projects */
  allowAnyDirectory?: boolean
}

export function DirectoryBrowser({
  open,
  onOpenChange,
  onSelect,
  initialPath,
  allowAnyDirectory = false,
}: DirectoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [directories, setDirectories] = useState<DirectoryEntry[]>([])
  const [isFlutterProject, setIsFlutterProject] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDirectory = useCallback(async (path?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result: BrowseResult = await browseDirectory(path)
      setCurrentPath(result.current_path)
      setParentPath(result.parent_path)
      setDirectories(result.directories)
      setIsFlutterProject(result.is_flutter_project)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load initial directory when dialog opens
  useEffect(() => {
    if (open) {
      loadDirectory(initialPath)
    }
  }, [open, initialPath, loadDirectory])

  const handleNavigate = (path: string) => {
    loadDirectory(path)
  }

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectory(parentPath)
    }
  }

  const handleGoHome = () => {
    loadDirectory()
  }

  const handleSelect = () => {
    onSelect(currentPath)
    onOpenChange(false)
  }

  // Parse path into breadcrumb segments
  const pathSegments = currentPath.split('/').filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {allowAnyDirectory ? 'Select Directory' : 'Select Flutter Project'}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoHome}
            disabled={isLoading}
            title="Go to home directory"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoUp}
            disabled={isLoading || !parentPath}
            title="Go up one level"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>

          {/* Breadcrumb */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto text-sm">
            <button
              onClick={() => handleNavigate('/')}
              className="text-muted-foreground hover:text-foreground px-1"
            >
              /
            </button>
            {pathSegments.map((segment, index) => {
              const segmentPath = '/' + pathSegments.slice(0, index + 1).join('/')
              const isLast = index === pathSegments.length - 1
              return (
                <span key={segmentPath} className="flex items-center">
                  <span className="text-muted-foreground">/</span>
                  <button
                    onClick={() => !isLast && handleNavigate(segmentPath)}
                    className={cn(
                      'px-1 truncate max-w-[150px]',
                      isLast
                        ? 'font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    disabled={isLast}
                  >
                    {segment}
                  </button>
                </span>
              )
            })}
          </div>
        </div>

        {/* Current path indicator */}
        {isFlutterProject && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md text-green-600 dark:text-green-400 text-sm">
            <Check className="h-4 w-4" />
            This is a valid Flutter project
          </div>
        )}

        {/* Directory listing */}
        <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive gap-2">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={() => loadDirectory()}>
                Go to Home
              </Button>
            </div>
          ) : directories.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No subdirectories</p>
            </div>
          ) : (
            <ul className="divide-y">
              {directories.map((dir) => (
                <li key={dir.path}>
                  <button
                    onClick={() => handleNavigate(dir.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{dir.name}</span>
                    {dir.is_flutter_project && (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <Check className="h-3 w-3" />
                        Flutter
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground truncate max-w-[300px]">
            {currentPath}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSelect} disabled={!allowAnyDirectory && !isFlutterProject}>
              {allowAnyDirectory ? 'Select This Directory' : (isFlutterProject ? 'Select' : 'Select a Flutter Project')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

