import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
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

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title?: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'destructive'
    onConfirm: () => void | Promise<void>
    /** If set, user must type this exact text to enable the confirm button */
    requireConfirmation?: string
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title = 'Confirm',
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    requireConfirmation,
}: ConfirmDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [confirmationInput, setConfirmationInput] = useState('')

    // Reset confirmation input when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setConfirmationInput('')
        }
    }, [open])

    const isConfirmationValid = !requireConfirmation || confirmationInput === requireConfirmation

    const handleConfirm = async () => {
        if (!isConfirmationValid) return
        
        setIsLoading(true)
        try {
            await onConfirm()
            onOpenChange(false)
        } finally {
            setIsLoading(false)
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setConfirmationInput('')
        }
        onOpenChange(newOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {variant === 'destructive' && (
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    <p className="text-muted-foreground">{description}</p>
                    
                    {requireConfirmation && (
                        <div className="space-y-2">
                            <Label htmlFor="confirmation-input" className="text-sm font-medium">
                                Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-destructive">{requireConfirmation}</span> to confirm
                            </Label>
                            <Input
                                id="confirmation-input"
                                value={confirmationInput}
                                onChange={(e) => setConfirmationInput(e.target.value)}
                                placeholder={requireConfirmation}
                                className={confirmationInput && !isConfirmationValid ? 'border-destructive' : ''}
                                autoComplete="off"
                            />
                        </div>
                    )}
                </DialogBody>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={isLoading || !isConfirmationValid}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                                Processing...
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Hook for easier usage
export function useConfirmDialog() {
    const [state, setState] = useState<{
        open: boolean
        title: string
        description: string
        confirmLabel: string
        variant: 'default' | 'destructive'
        onConfirm: () => void | Promise<void>
        requireConfirmation?: string
    }>({
        open: false,
        title: 'Confirm',
        description: '',
        confirmLabel: 'Confirm',
        variant: 'default',
        onConfirm: () => { },
        requireConfirmation: undefined,
    })

    const confirm = useCallback(
        (options: {
            title?: string
            description: string
            confirmLabel?: string
            variant?: 'default' | 'destructive'
            requireConfirmation?: string
        }): Promise<boolean> => {
            return new Promise((resolve) => {
                setState({
                    open: true,
                    title: options.title || 'Confirm',
                    description: options.description,
                    confirmLabel: options.confirmLabel || 'Confirm',
                    variant: options.variant || 'default',
                    requireConfirmation: options.requireConfirmation,
                    onConfirm: () => resolve(true),
                })
            })
        },
        []
    )

    const handleOpenChange = useCallback((open: boolean) => {
        setState((prev) => ({ ...prev, open }))
    }, [])

    const dialogProps = {
        open: state.open,
        onOpenChange: handleOpenChange,
        title: state.title,
        description: state.description,
        confirmLabel: state.confirmLabel,
        variant: state.variant,
        onConfirm: state.onConfirm,
        requireConfirmation: state.requireConfirmation,
    }

    return { confirm, dialogProps, ConfirmDialog }
}
