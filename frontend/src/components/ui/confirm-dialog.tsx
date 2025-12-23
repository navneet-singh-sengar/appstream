import { useState, useCallback } from 'react'
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

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title?: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'destructive'
    onConfirm: () => void | Promise<void>
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
}: ConfirmDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleConfirm = async () => {
        setIsLoading(true)
        try {
            await onConfirm()
            onOpenChange(false)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {variant === 'destructive' && (
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <DialogBody>
                    <p className="text-muted-foreground">{description}</p>
                </DialogBody>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={isLoading}
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
    }>({
        open: false,
        title: 'Confirm',
        description: '',
        confirmLabel: 'Confirm',
        variant: 'default',
        onConfirm: () => { },
    })

    const confirm = useCallback(
        (options: {
            title?: string
            description: string
            confirmLabel?: string
            variant?: 'default' | 'destructive'
        }): Promise<boolean> => {
            return new Promise((resolve) => {
                setState({
                    open: true,
                    title: options.title || 'Confirm',
                    description: options.description,
                    confirmLabel: options.confirmLabel || 'Confirm',
                    variant: options.variant || 'default',
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
    }

    return { confirm, dialogProps, ConfirmDialog }
}
