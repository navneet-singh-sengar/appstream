import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus,
  Trash2,
  Settings,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileOutput,
  Copy,
  Cog,
  Hammer,
  Folder,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StepConfigDialog } from './step-config-dialog'
import type { WorkflowStep, StepType } from '@/types'

interface InlineWorkflowEditorProps {
  title: string
  steps: WorkflowStep[]
  availableSteps: StepType[]
  onChange: (steps: WorkflowStep[]) => void
  className?: string
}

// Icon mapping for step types
const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Hammer,
  Terminal,
  FileOutput,
  Copy,
  Cog,
  Folder,
}

// Category styling
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  build: {
    label: 'Build',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  },
  utility: {
    label: 'Utility',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
  },
  file: {
    label: 'File Operations',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  },
  general: {
    label: 'General',
    color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  },
}

// Category order for sorting
const CATEGORY_ORDER = ['build', 'utility', 'file', 'general']

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

// Get step icon component
function StepIcon({ icon, className }: { icon: string; className?: string }) {
  const IconComponent = STEP_ICONS[icon] || Cog
  return <IconComponent className={className} />
}

// Get config summary for display
function getConfigSummary(step: WorkflowStep, stepType: StepType | undefined): string {
  if (!stepType) return ''

  const config = step.config

  // Custom display logic per step type
  switch (step.type) {
    case 'custom_args': {
      const args = config.arguments as string
      if (args) {
        const lines = args.split('\n').filter(Boolean)
        if (lines.length === 1) return lines[0]
        if (lines.length > 1) return `${lines[0]} (+${lines.length - 1} more)`
      }
      return 'No arguments'
    }
    case 'run_script': {
      const script = config.script as string
      if (script) {
        const firstLine = script.split('\n')[0]
        return firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine
      }
      return 'No script'
    }
    case 'copy_files': {
      const source = config.source as string
      const dest = config.destination as string
      if (source && dest) return `${source} → ${dest}`
      return 'Not configured'
    }
    case 'move_file': {
      const source = config.source as string
      const dest = config.destination as string
      if (source && dest) return `${source} → ${dest}`
      return 'Not configured'
    }
    case 'android_setup': {
      // Show enabled operations
      const ops = []
      if (config.update_app_name) ops.push('name')
      if (config.update_package_id) ops.push('package')
      if (config.update_main_activity) ops.push('activity')
      if (config.apply_app_icon) {
        const resZip = config.res_zip_file as { filename?: string } | undefined
        ops.push(resZip?.filename ? `icon (${resZip.filename})` : 'icon')
      }
      return ops.length > 0 ? ops.join(', ') : 'Click to configure'
    }
    default: {
      // Generic: show first non-empty config value
      for (const field of stepType.configFields) {
        const value = config[field.name]
        if (value !== undefined && value !== null && value !== '') {
          // Handle file objects
          if (typeof value === 'object' && value !== null && 'filename' in value) {
            return (value as { filename: string }).filename
          }
          const str = String(value)
          return str.length > 50 ? str.slice(0, 50) + '...' : str
        }
      }
      return 'Click to configure'
    }
  }
}

export function InlineWorkflowEditor({
  title,
  steps,
  availableSteps,
  onChange,
  className,
}: InlineWorkflowEditorProps) {
  const [isExpanded, setIsExpanded] = useState(steps.length > 0)
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  const addButtonRef = useRef<HTMLButtonElement>(null)

  // Create step type map for quick lookup
  const stepTypeMap = useMemo(() => {
    const map: Record<string, StepType> = {}
    for (const step of availableSteps) {
      map[step.type] = step
    }
    return map
  }, [availableSteps])

  // Group steps by category
  const groupedSteps = useMemo(() => {
    const groups: Record<string, StepType[]> = {}

    for (const step of availableSteps) {
      const category = step.category || 'general'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(step)
    }

    // Sort by category order
    const sorted: { category: string; steps: StepType[] }[] = []
    for (const cat of CATEGORY_ORDER) {
      if (groups[cat]) {
        sorted.push({ category: cat, steps: groups[cat] })
      }
    }
    // Add remaining categories
    for (const cat of Object.keys(groups)) {
      if (!CATEGORY_ORDER.includes(cat)) {
        sorted.push({ category: cat, steps: groups[cat] })
      }
    }

    return sorted
  }, [availableSteps])

  // Calculate dropdown position when opening
  useEffect(() => {
    if (showAddMenu && addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.right - 280, // Align right edge with button
        width: 280,
      })
    }
  }, [showAddMenu])

  const handleAddStep = (stepType: string) => {
    const stepTypeDef = stepTypeMap[stepType]
    const defaultConfig: Record<string, unknown> = {}

    if (stepTypeDef) {
      for (const field of stepTypeDef.configFields) {
        if (field.default !== undefined) {
          defaultConfig[field.name] = field.default
        }
      }
    }

    const newStep: WorkflowStep = {
      id: generateId(),
      type: stepType,
      config: defaultConfig,
    }

    onChange([...steps, newStep])
    setShowAddMenu(false)
    setIsExpanded(true)

    // Open config dialog for new step
    setEditingStep(newStep)
  }

  const handleRemoveStep = (index: number) => {
    const newSteps = [...steps]
    newSteps.splice(index, 1)
    onChange(newSteps)
  }

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step)
  }

  const handleSaveStep = async (config: Record<string, unknown>, name?: string, files?: Record<string, File>) => {
    if (!editingStep) return

    // If there are files, we need to handle them
    // For now, we convert files to base64 and store in config
    // This allows the workflow to be saved with the app without needing a separate upload endpoint
    let finalConfig = { ...config }

    if (files) {
      for (const [fieldName, file] of Object.entries(files)) {
        // Convert file to base64 for storage
        const base64 = await fileToBase64(file)
        finalConfig[fieldName] = {
          filename: file.name,
          size: file.size,
          type: file.type,
          data: base64,
        }
      }
    }

    const newSteps = steps.map(s =>
      s.id === editingStep.id
        ? { ...s, config: finalConfig, name }
        : s
    )
    onChange(newSteps)
    setEditingStep(null)
  }

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newSteps = [...steps]
    const [removed] = newSteps.splice(draggedIndex, 1)
    newSteps.splice(index, 0, removed)
    onChange(newSteps)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const editingStepType = editingStep ? stepTypeMap[editingStep.type] : null

  // Dropdown menu rendered via portal
  const dropdownMenu = showAddMenu && dropdownPosition && createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        onClick={() => setShowAddMenu(false)}
      />
      {/* Dropdown */}
      <div
        className="fixed z-[60] bg-popover border rounded-lg shadow-xl py-2 max-h-[400px] overflow-y-auto"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        {groupedSteps.map(({ category, steps: categorySteps }) => {
          const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general

          return (
            <div key={category} className="mb-2 last:mb-0">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {categoryConfig.label}
              </div>
              {categorySteps.map((stepType) => (
                <button
                  key={stepType.type}
                  type="button"
                  onClick={() => handleAddStep(stepType.type)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                >
                  <div className={cn(
                    'p-1.5 rounded-md flex-shrink-0 mt-0.5',
                    categoryConfig.color
                  )}>
                    <StepIcon icon={stepType.icon} className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{stepType.displayName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {stepType.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        })}

        {availableSteps.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            No step types available
          </div>
        )}
      </div>
    </>,
    document.body
  )

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          {title}
          {steps.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
              {steps.length}
            </span>
          )}
        </button>

        <Button
          ref={addButtonRef}
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Step
        </Button>
      </div>

      {/* Dropdown rendered via portal */}
      {dropdownMenu}

      {/* Steps List */}
      {isExpanded && (
        <div className="space-y-2">
          {steps.length === 0 ? (
            <div className="py-4 px-3 border border-dashed rounded-lg text-center">
              <p className="text-xs text-muted-foreground">
                No steps configured. Click "Add Step" to get started.
              </p>
            </div>
          ) : (
            steps.map((step, index) => {
              const stepType = stepTypeMap[step.type]
              const categoryConfig = stepType
                ? CATEGORY_CONFIG[stepType.category] || CATEGORY_CONFIG.general
                : CATEGORY_CONFIG.general
              const configSummary = getConfigSummary(step, stepType)

              return (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'group flex items-start gap-2 p-2.5 rounded-lg border bg-card transition-all',
                    'hover:border-primary/30 hover:shadow-sm',
                    draggedIndex === index && 'opacity-50 border-primary'
                  )}
                >
                  <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
                    <div className={cn('p-1.5 rounded-md', categoryConfig.color)}>
                      <StepIcon icon={stepType?.icon || 'Cog'} className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEditStep(step)}>
                    <div className="text-sm font-medium">
                      {step.name || stepType?.displayName || step.type}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                      {configSummary}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEditStep(step)}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveStep(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Step Config Dialog */}
      <StepConfigDialog
        open={!!editingStep}
        onOpenChange={(open) => !open && setEditingStep(null)}
        step={editingStep}
        stepType={editingStepType}
        onSave={handleSaveStep}
      />
    </div>
  )
}
