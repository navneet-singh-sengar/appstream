import { useState, useEffect } from 'react'
import { Info, RefreshCw, Server, Monitor, Cpu, Package } from 'lucide-react'
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getSystemInfo, type SystemInfo } from '@/services/api'

// Frontend versions from package.json (injected at build time via Vite)
const FRONTEND_VERSIONS = {
    react: '19.2.0',
    vite: '7.2.4',
    typescript: '5.9.3',
    tailwind: '4.1.18',
}

interface InfoRowProps {
    label: string
    value: string | null | undefined
}

function InfoRow({ label, value }: InfoRowProps) {
    return (
        <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono text-sm">{value || 'N/A'}</span>
        </div>
    )
}

interface InfoSectionProps {
    icon: React.ReactNode
    title: string
    children: React.ReactNode
}

function InfoSection({ icon, title, children }: InfoSectionProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
                {icon}
                {title}
            </div>
            <div className="pl-6 text-sm">{children}</div>
        </div>
    )
}

export function SystemInfoDialog() {
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchSystemInfo = async () => {
        setLoading(true)
        setError(null)
        try {
            const info = await getSystemInfo()
            setSystemInfo(info)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load system info')
        } finally {
            setLoading(false)
        }
    }

    // Fetch on first open
    useEffect(() => {
        fetchSystemInfo()
    }, [])

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="System Information">
                    <Info className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        System Information
                    </DialogTitle>
                    <DialogDescription>
                        Version and environment details
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-6 max-h-[60vh] overflow-y-auto">
                    {loading && !systemInfo && (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {error && (
                        <div className="text-center text-destructive py-4">
                            <p>{error}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchSystemInfo}
                                className="mt-2"
                            >
                                Retry
                            </Button>
                        </div>
                    )}

                    {systemInfo && (
                        <>
                            {/* App Version */}
                            <InfoSection
                                icon={<Package className="h-4 w-4" />}
                                title="Application"
                            >
                                <InfoRow label="App Version" value={systemInfo.app_version} />
                            </InfoSection>

                            {/* Frontend */}
                            <InfoSection
                                icon={<Monitor className="h-4 w-4" />}
                                title="Frontend"
                            >
                                <InfoRow label="React" value={FRONTEND_VERSIONS.react} />
                                <InfoRow label="Vite" value={FRONTEND_VERSIONS.vite} />
                                <InfoRow label="TypeScript" value={FRONTEND_VERSIONS.typescript} />
                                <InfoRow label="Tailwind CSS" value={FRONTEND_VERSIONS.tailwind} />
                            </InfoSection>

                            {/* Backend */}
                            <InfoSection
                                icon={<Server className="h-4 w-4" />}
                                title="Backend"
                            >
                                <InfoRow label="Python" value={systemInfo.backend.python} />
                                <InfoRow label="Flask" value={systemInfo.backend.flask} />
                                <InfoRow label="Socket.IO" value={systemInfo.backend.socketio} />
                            </InfoSection>

                            {/* Flutter */}
                            {systemInfo.flutter && (
                                <InfoSection
                                    icon={
                                        <svg
                                            className="h-4 w-4"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                        >
                                            <path d="M14.314 0L2.3 12 6 15.7 21.684.013h-7.357zm.014 11.072L7.857 17.53l6.47 6.47H21.7l-6.46-6.468 6.46-6.46h-7.37z" />
                                        </svg>
                                    }
                                    title="Flutter"
                                >
                                    <InfoRow label="Flutter" value={systemInfo.flutter.version} />
                                    <InfoRow label="Channel" value={systemInfo.flutter.channel} />
                                    <InfoRow label="Dart" value={systemInfo.flutter.dart} />
                                </InfoSection>
                            )}

                            {/* System */}
                            <InfoSection
                                icon={<Cpu className="h-4 w-4" />}
                                title="System"
                            >
                                <InfoRow label="OS" value={systemInfo.system.os} />
                                <InfoRow label="Version" value={systemInfo.system.os_version} />
                                <InfoRow label="Architecture" value={systemInfo.system.architecture} />
                                <InfoRow label="Hostname" value={systemInfo.system.hostname} />
                            </InfoSection>
                        </>
                    )}
                </DialogBody>

                {/* Refresh Button */}
                <div className="flex justify-end pt-2 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchSystemInfo}
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

