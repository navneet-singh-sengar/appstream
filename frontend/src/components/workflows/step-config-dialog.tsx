import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import {
  Terminal,
  FileOutput,
  Copy,
  Cog,
  Hammer,
  Folder,
  Info,
  X,
  Upload,
  FileArchive,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowStep, StepType, StepConfigField } from '@/types'

interface StepConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: WorkflowStep | null
  stepType: StepType | null
  onSave: (config: Record<string, unknown>, name?: string, files?: Record<string, File>) => Promise<void>
}

// Icon mapping
const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Hammer,
  Terminal,
  FileOutput,
  Copy,
  Cog,
  Folder,
}

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  build: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  utility: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  file: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  general: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
}

interface FieldProps {
  field: StepConfigField
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

// Helper to render description with clickable links
function FieldDescription({ text }: { text: string }) {
  // Pattern to match URLs and "text at domain" patterns
  const urlPattern = /(https?:\/\/[^\s]+)|(\bat\s+)([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = urlPattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[1]) {
      // Full URL match
      const url = match[1]
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {url}
        </a>
      )
    } else if (match[2] && match[3]) {
      // "at domain" pattern - convert to link
      const domain = match[3]
      parts.push(match[2]) // "at "
      parts.push(
        <a
          key={match.index}
          href={`https://${domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {domain}
        </a>
      )
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts.length > 0 ? parts : text}</>
}

function TextField({ field, value, onChange, error }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        type={field.type === 'number' ? 'number' : 'text'}
        value={value as string || ''}
        onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={field.placeholder}
        className={cn(error && 'border-destructive')}
      />
      {field.description && (
        <p className="text-xs text-muted-foreground">
          <FieldDescription text={field.description} />
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function TextareaField({ field, value, onChange, error }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <textarea
        value={value as string || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={6}
        className={cn(
          'w-full px-3 py-2.5 text-sm rounded-lg border bg-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'font-mono leading-relaxed resize-y min-h-[120px]',
          error ? 'border-destructive' : 'border-input'
        )}
      />
      {field.description && (
        <p className="text-xs text-muted-foreground">
          <FieldDescription text={field.description} />
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function BooleanField({ field, value, onChange }: FieldProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
      <Checkbox
        checked={value as boolean || false}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div className="space-y-1 flex-1">
        <Label className="text-sm font-medium cursor-pointer" onClick={() => onChange(!value)}>
          {field.label}
        </Label>
        {field.description && (
          <p className="text-xs text-muted-foreground">
            <FieldDescription text={field.description} />
          </p>
        )}
      </div>
    </div>
  )
}

function SelectField({ field, value, onChange, error }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select
        value={value as string || ''}
        onChange={(e) => onChange(e.target.value)}
        className={cn(error && 'border-destructive')}
      >
        <option value="">Select...</option>
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      {field.description && (
        <p className="text-xs text-muted-foreground">
          <FieldDescription text={field.description} />
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function MultiSelectField({ field, value, onChange }: FieldProps) {
  const selectedValues = Array.isArray(value) ? value : []

  const toggleOption = (optValue: string) => {
    if (selectedValues.includes(optValue)) {
      onChange(selectedValues.filter(v => v !== optValue))
    } else {
      onChange([...selectedValues, optValue])
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
        {field.options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <Checkbox
              checked={selectedValues.includes(opt.value)}
              onChange={() => toggleOption(opt.value)}
            />
            <span className="text-sm">{opt.label}</span>
          </div>
        ))}
      </div>
      {field.description && (
        <p className="text-xs text-muted-foreground">
          <FieldDescription text={field.description} />
        </p>
      )}
    </div>
  )
}

interface FileFieldProps extends FieldProps {
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
}

function FileField({ field, value, onChange, error, onFileSelect, selectedFile }: FileFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Value can be either a file path (string) or file data object
  const existingFile = typeof value === 'object' && value !== null
    ? (value as { filename?: string; path?: string })
    : typeof value === 'string' && value
      ? { filename: value.split('/').pop(), path: value }
      : null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
      // Store file info in config (actual upload happens on save)
      onChange({
        filename: file.name,
        size: file.size,
        pending: true,  // Mark as pending upload
      })
    }
  }

  const handleRemove = () => {
    onFileSelect(null)
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayFile = selectedFile
    ? { name: selectedFile.name, size: selectedFile.size, isPending: true }
    : existingFile
      ? { name: existingFile.filename || 'Unknown file', size: null, isPending: false }
      : null

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {displayFile ? (
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg border',
          displayFile.isPending ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900' : 'bg-muted/30'
        )}>
          <FileArchive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayFile.name}</p>
            {displayFile.size && (
              <p className="text-xs text-muted-foreground">
                {(displayFile.size / 1024).toFixed(1)} KB
                {displayFile.isPending && <span className="ml-2 text-blue-600">(will be uploaded on save)</span>}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={handleRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            'hover:border-primary hover:bg-accent/50',
            error ? 'border-destructive' : 'border-muted-foreground/25'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">Click to upload</p>
            <p className="text-xs text-muted-foreground">
              {field.accept ? `Accepts: ${field.accept}` : 'Any file'}
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={field.accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {field.description && (
        <p className="text-xs text-muted-foreground">
          <FieldDescription text={field.description} />
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

interface ConfigFieldExtendedProps extends FieldProps {
  onFileSelect?: (fieldName: string, file: File | null) => void
  selectedFile?: File | null
}

function ConfigField({ field, value, onChange, error, onFileSelect, selectedFile }: ConfigFieldExtendedProps) {
  switch (field.type) {
    case 'textarea':
      return <TextareaField field={field} value={value} onChange={onChange} error={error} />
    case 'boolean':
      return <BooleanField field={field} value={value} onChange={onChange} error={error} />
    case 'select':
      return <SelectField field={field} value={value} onChange={onChange} error={error} />
    case 'multiselect':
      return <MultiSelectField field={field} value={value} onChange={onChange} error={error} />
    case 'file':
      return (
        <FileField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          onFileSelect={(file) => onFileSelect?.(field.name, file)}
          selectedFile={selectedFile || null}
        />
      )
    case 'string':
    case 'number':
    default:
      return <TextField field={field} value={value} onChange={onChange} error={error} />
  }
}

export function StepConfigDialog({
  open,
  onOpenChange,
  step,
  stepType,
  onSave,
}: StepConfigDialogProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [stepName, setStepName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({})

  // Handle escape key
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && step && stepType) {
      // Start with defaults from step type
      const initialConfig: Record<string, unknown> = {}
      for (const field of stepType.configFields) {
        initialConfig[field.name] = field.default
      }
      // Override with existing step config
      setConfig({ ...initialConfig, ...step.config })
      setStepName(step.name || '')
      setErrors({})
      setPendingFiles({})  // Clear pending files when dialog opens
    }
  }, [open, step, stepType])

  // Handle file selection for file fields
  const handleFileSelect = (fieldName: string, file: File | null) => {
    setPendingFiles(prev => {
      if (file) {
        return { ...prev, [fieldName]: file }
      } else {
        const next = { ...prev }
        delete next[fieldName]
        return next
      }
    })
  }

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [fieldName]: value }))
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    }
  }

  const validate = (): boolean => {
    if (!stepType) return false

    const newErrors: Record<string, string> = {}

    for (const field of stepType.configFields) {
      if (field.required) {
        const value = config[field.name]
        if (value === undefined || value === null || value === '') {
          newErrors[field.name] = `${field.label} is required`
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setIsSubmitting(true)
    try {
      // Pass pending files along with config
      const filesToUpload = Object.keys(pendingFiles).length > 0 ? pendingFiles : undefined
      await onSave(config, stepName || undefined, filesToUpload)
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save step config:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const IconComponent = stepType ? (STEP_ICONS[stepType.icon] || Cog) : Cog
  const categoryColor = stepType
    ? CATEGORY_COLORS[stepType.category] || CATEGORY_COLORS.general
    : CATEGORY_COLORS.general

  if (!open) return null

  // Render dialog via portal to ensure it appears above parent dialog
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog Content */}
      <div className="fixed left-1/2 top-1/2 z-[60] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 border bg-background shadow-lg sm:rounded-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <div className="flex items-center gap-3">
            {stepType && (
              <div className={cn('p-2.5 rounded-lg', categoryColor)}>
                <IconComponent className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-semibold leading-none tracking-tight">Configure Step</h2>
              {stepType && (
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  {stepType.displayName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-5">
            {/* Step description */}
            {stepType && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {stepType.description}
                </p>
              </div>
            )}

            {/* Step name (optional) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Step Name</Label>
              <Input
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                placeholder={stepType?.displayName || 'Step name'}
              />
              <p className="text-xs text-muted-foreground">
                Optional custom name for easier identification
              </p>
            </div>

            {/* Config fields */}
            {stepType && stepType.configFields.length > 0 && (
              <div className="space-y-4 pt-2 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Configuration
                </h4>

                <div className="space-y-4">
                  {stepType.configFields.map((field) => (
                    <ConfigField
                      key={field.name}
                      field={field}
                      value={config[field.name]}
                      onChange={(value) => handleFieldChange(field.name, value)}
                      error={errors[field.name]}
                      onFileSelect={handleFileSelect}
                      selectedFile={pendingFiles[field.name]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No config fields message */}
            {stepType && stepType.configFields.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/30">
                This step has no configurable options
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Step'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
