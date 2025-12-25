import { useState, useEffect, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { fetchAvailableSteps } from '@/services/api'
import { InlineWorkflowEditor } from '@/components/workflows'
import type { App, AppFormData, Platform, BuildSettings, PlatformSettings, WorkflowStep, WorkflowConfig, StepType } from '@/types'

interface AppFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  app?: App | null
  onSubmit: (data: AppFormData) => Promise<void>
  mode: 'add' | 'edit'
  defaultPlatforms?: Platform[]
}

const allPlatforms: Platform[] = ['android', 'ios', 'web', 'macos', 'windows', 'linux']

const platformLabels: Record<Platform, string> = {
  android: 'Android',
  ios: 'iOS',
  web: 'Web',
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
}

// Helper to ensure workflow config
function ensureWorkflowConfig(workflow: WorkflowConfig | undefined): WorkflowConfig {
  return {
    preSteps: workflow?.preSteps || [],
    postSteps: workflow?.postSteps || [],
  }
}

export function AppForm({
  open,
  onOpenChange,
  app,
  onSubmit,
  mode,
  defaultPlatforms = [],
}: AppFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<AppFormData>({
    appName: '',
    packageId: '',
    platforms: [],
    buildSettings: {},
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activePlatformTab, setActivePlatformTab] = useState<Platform | null>(null)
  const [availableSteps, setAvailableSteps] = useState<StepType[]>([])
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Fetch available workflow steps
  useEffect(() => {
    fetchAvailableSteps()
      .then(setAvailableSteps)
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && app) {
        // Convert build settings to only contain workflow
        const convertedBuildSettings: Partial<Record<Platform, BuildSettings>> = {}
        if (app.buildSettings) {
          for (const [platform, settings] of Object.entries(app.buildSettings)) {
            convertedBuildSettings[platform as Platform] = {
              build: settings?.build ? {
                workflow: ensureWorkflowConfig(settings.build.workflow),
              } : undefined,
              run: settings?.run ? {
                workflow: ensureWorkflowConfig(settings.run.workflow),
              } : undefined,
            }
          }
        }

        setFormData({
          appName: app.appName,
          packageId: app.packageId,
          platforms: app.platforms,
          logoUrl: app.logoUrl,
          buildSettings: convertedBuildSettings,
        })
        // Set active tab to first enabled platform, or first platform overall
        setActivePlatformTab(app.platforms[0] || allPlatforms[0])
      } else {
        // For add mode, pre-select the project's detected platforms
        setFormData({
          appName: '',
          packageId: '',
          platforms: defaultPlatforms,
          buildSettings: {},
        })
        // Set active tab to first default platform, or first platform overall
        setActivePlatformTab(defaultPlatforms[0] || allPlatforms[0])
      }
      setErrors({})
    }
  }, [open, app, mode, defaultPlatforms])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.appName.trim()) {
      newErrors.appName = 'App name is required'
    }
    if (!formData.packageId.trim()) {
      newErrors.packageId = 'Package ID is required'
    }
    if (formData.platforms.length === 0) {
      newErrors.platforms = 'At least one platform is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to submit:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePlatformToggle = (platform: Platform) => {
    setFormData((prev) => {
      const platforms = prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform]
      return { ...prev, platforms }
    })
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Convert to base64 for storage and display
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: undefined }))
    if (logoInputRef.current) {
      logoInputRef.current.value = ''
    }
  }

  // Get workflow steps for a platform/mode/position
  const getWorkflowSteps = (
    platform: Platform,
    settingsMode: 'build' | 'run',
    position: 'preSteps' | 'postSteps'
  ): WorkflowStep[] => {
    const settings = formData.buildSettings?.[platform]?.[settingsMode]
    return settings?.workflow?.[position] || []
  }

  // Update workflow steps
  const updateWorkflowSteps = (
    platform: Platform,
    settingsMode: 'build' | 'run',
    position: 'preSteps' | 'postSteps',
    steps: WorkflowStep[]
  ) => {
    setFormData((prev) => {
      const currentSettings = prev.buildSettings || {}
      const platformSettings: BuildSettings = currentSettings[platform] || {}
      const modeSettings: PlatformSettings = platformSettings[settingsMode] || {}
      const currentWorkflow = modeSettings.workflow || { preSteps: [], postSteps: [] }

      return {
        ...prev,
        buildSettings: {
          ...currentSettings,
          [platform]: {
            ...platformSettings,
            [settingsMode]: {
              ...modeSettings,
              workflow: {
                ...currentWorkflow,
                [position]: steps
              }
            }
          }
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add New App' : 'Edit App'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h6 className="font-semibold">Basic Information</h6>

              <div className="space-y-2">
                <Label required>App Name</Label>
                <Input
                  placeholder="My Awesome App"
                  value={formData.appName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      appName: e.target.value,
                    }))
                  }
                />
                {errors.appName && (
                  <p className="text-sm text-destructive">{errors.appName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label required>Package ID</Label>
                <Input
                  placeholder="com.example.app"
                  value={formData.packageId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      packageId: e.target.value,
                    }))
                  }
                />
                {errors.packageId && (
                  <p className="text-sm text-destructive">{errors.packageId}</p>
                )}
              </div>
            </div>

            {/* App Logo */}
            <div className="space-y-4">
              <h6 className="font-semibold">App Logo</h6>
              <p className="text-sm text-muted-foreground">
                Upload a logo to display in the app list (optional)
              </p>

              <div className="flex items-start gap-4">
                {formData.logoUrl ? (
                  <div className="relative group">
                    <img
                      src={formData.logoUrl}
                      alt="App logo preview"
                      className="w-20 h-20 rounded-xl object-cover border border-border"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-accent transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-xs">Add</span>
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                {formData.logoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    Change
                  </Button>
                )}
              </div>
            </div>

            {/* Platform Selection & Configuration */}
            <div className="space-y-4">
              <h6 className="font-semibold">Platforms & Workflow</h6>
              <p className="text-sm text-muted-foreground">
                Enable platforms and configure build/run workflow steps. Use platform-specific setup steps (e.g., "Android Setup") in your workflow.
              </p>

              {/* Platform Tabs with Checkboxes */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex flex-wrap border-b bg-muted/30">
                  {allPlatforms.map((platform) => {
                    const isEnabled = formData.platforms.includes(platform)
                    const isActive = activePlatformTab === platform
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => setActivePlatformTab(platform)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px]',
                          isActive
                            ? 'border-primary bg-background text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                      >
                        <Checkbox
                          checked={isEnabled}
                          onChange={() => { }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePlatformToggle(platform)
                          }}
                        />
                        <PlatformIcon platform={platform} />
                        <span className={cn(!isEnabled && 'opacity-50')}>{platformLabels[platform]}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Active Platform Content */}
                {activePlatformTab && (
                  <div className="p-4 space-y-4">
                    {!formData.platforms.includes(activePlatformTab) ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">Enable {platformLabels[activePlatformTab]} to configure workflow</p>
                      </div>
                    ) : (
                      <>
                        {/* Build Workflow */}
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-primary uppercase tracking-wide">Build Workflow</div>
                          <p className="text-xs text-muted-foreground">
                            Add steps to run before/after flutter build. Use "Android Setup" for Android config, "Custom Arguments" for build flags.
                          </p>
                          <div className="space-y-2">
                            <InlineWorkflowEditor
                              title="Pre-Build Steps"
                              steps={getWorkflowSteps(activePlatformTab, 'build', 'preSteps')}
                              availableSteps={availableSteps}
                              onChange={(steps) => updateWorkflowSteps(activePlatformTab, 'build', 'preSteps', steps)}
                            />
                            <InlineWorkflowEditor
                              title="Post-Build Steps"
                              steps={getWorkflowSteps(activePlatformTab, 'build', 'postSteps')}
                              availableSteps={availableSteps}
                              onChange={(steps) => updateWorkflowSteps(activePlatformTab, 'build', 'postSteps', steps)}
                            />
                          </div>
                        </div>

                        {/* Run Workflow */}
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Run Workflow</div>
                          <p className="text-xs text-muted-foreground">
                            Add steps to run before/after flutter run. Use "Custom Arguments" step to add run flags.
                          </p>
                          <div className="space-y-2">
                            <InlineWorkflowEditor
                              title="Pre-Run Steps"
                              steps={getWorkflowSteps(activePlatformTab, 'run', 'preSteps')}
                              availableSteps={availableSteps}
                              onChange={(steps) => updateWorkflowSteps(activePlatformTab, 'run', 'preSteps', steps)}
                            />
                            <InlineWorkflowEditor
                              title="Post-Run Steps"
                              steps={getWorkflowSteps(activePlatformTab, 'run', 'postSteps')}
                              availableSteps={availableSteps}
                              onChange={(steps) => updateWorkflowSteps(activePlatformTab, 'run', 'postSteps', steps)}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              {errors.platforms && (
                <p className="text-sm text-destructive">{errors.platforms}</p>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                {mode === 'add' ? 'Adding...' : 'Updating...'}
              </>
            ) : mode === 'add' ? (
              'Add App'
            ) : (
              'Update App'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PlatformIcon({ platform }: { platform: Platform }) {
  switch (platform) {
    case 'android':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
        </svg>
      )
    case 'ios':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      )
    case 'web':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      )
    case 'macos':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      )
    case 'windows':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z" />
        </svg>
      )
    case 'linux':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.117-.468.32-.753.696-.933z" />
        </svg>
      )
    default:
      return null
  }
}
