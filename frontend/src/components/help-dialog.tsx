import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, ChevronDown, ChevronRight, Lightbulb, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { helpSections, searchHelp, type HelpSection, type HelpContent } from '@/data/help-content'

interface HelpDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
    const searchInputRef = useRef<HTMLInputElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    const filteredSections = useMemo(() => {
        return searchHelp(searchQuery)
    }, [searchQuery])

    // Auto-expand all sections when searching
    useEffect(() => {
        if (searchQuery.trim()) {
            setExpandedSections(new Set(filteredSections.map((s) => s.id)))
        }
    }, [searchQuery, filteredSections])

    // Focus search input when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                searchInputRef.current?.focus()
            }, 100)
        } else {
            setSearchQuery('')
            setExpandedSections(new Set())
        }
    }, [open])

    // Handle escape key
    useEffect(() => {
        if (!open) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onOpenChange(false)
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [open, onOpenChange])

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev)
            if (next.has(sectionId)) {
                next.delete(sectionId)
            } else {
                next.add(sectionId)
            }
            return next
        })
    }

    const scrollToSection = (sectionId: string) => {
        setExpandedSections((prev) => new Set([...prev, sectionId]))
        setTimeout(() => {
            const element = document.getElementById(`help-section-${sectionId}`)
            element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
    }

    if (!open) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />

            {/* Dialog */}
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex flex-col border bg-background shadow-2xl rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                    <h2 className="text-xl font-semibold">Help & Documentation</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Search */}
                <div className="px-6 py-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Search help topics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10"
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                onClick={() => setSearchQuery('')}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    {searchQuery && (
                        <p className="text-xs text-muted-foreground mt-2">
                            {filteredSections.length} {filteredSections.length === 1 ? 'topic' : 'topics'} found
                        </p>
                    )}
                </div>

                {/* Content */}
                <div ref={contentRef} className="flex-1 overflow-y-auto">
                    {/* Table of Contents - only show when not searching */}
                    {!searchQuery && (
                        <div className="px-6 py-4 border-b bg-muted/20">
                            <p className="text-xs font-medium text-muted-foreground mb-2">QUICK NAVIGATION</p>
                            <div className="flex flex-wrap gap-2">
                                {helpSections.map((section) => {
                                    const Icon = section.icon
                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => scrollToSection(section.id)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-background border hover:bg-accent hover:text-accent-foreground transition-colors"
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            {section.title}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sections */}
                    <div className="divide-y">
                        {filteredSections.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <p className="text-muted-foreground">No topics found for "{searchQuery}"</p>
                                <p className="text-sm text-muted-foreground mt-1">Try different keywords</p>
                            </div>
                        ) : (
                            filteredSections.map((section) => (
                                <HelpSectionItem
                                    key={section.id}
                                    section={section}
                                    isExpanded={expandedSections.has(section.id)}
                                    onToggle={() => toggleSection(section.id)}
                                    searchQuery={searchQuery}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">?</kbd> to open help • <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Esc</kbd> to close
                </div>
            </div>
        </div>,
        document.body
    )
}

interface HelpSectionItemProps {
    section: HelpSection
    isExpanded: boolean
    onToggle: () => void
    searchQuery: string
}

function HelpSectionItem({ section, isExpanded, onToggle, searchQuery }: HelpSectionItemProps) {
    const Icon = section.icon

    return (
        <div id={`help-section-${section.id}`} className="scroll-mt-4">
            {/* Section Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-muted/50 transition-colors text-left"
            >
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                </div>
                <span className="flex-1 font-medium">{section.title}</span>
                {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
            </button>

            {/* Section Content */}
            {isExpanded && (
                <div className="px-6 pb-6 pl-[4.5rem]">
                    <div className="space-y-4">
                        {section.content.map((item, index) => (
                            <HelpContentItem key={index} item={item} searchQuery={searchQuery} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

interface HelpContentItemProps {
    item: HelpContent
    searchQuery: string
}

function HelpContentItem({ item, searchQuery }: HelpContentItemProps) {
    const highlightText = (text: string) => {
        if (!searchQuery.trim()) return text

        const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        const parts = text.split(regex)

        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
                    {part}
                </mark>
            ) : (
                part
            )
        )
    }

    switch (item.type) {
        case 'heading':
            return (
                <h3 className="font-semibold text-foreground mt-2">
                    {highlightText(item.text || '')}
                </h3>
            )

        case 'paragraph':
            return (
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {highlightText(item.text || '')}
                </p>
            )

        case 'list':
            return (
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {item.items?.map((listItem, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="text-primary mt-1.5">•</span>
                            <span>{highlightText(listItem)}</span>
                        </li>
                    ))}
                </ul>
            )

        case 'code':
            return (
                <pre className="p-3 rounded-lg bg-muted text-sm font-mono overflow-x-auto">
                    <code>{item.text}</code>
                </pre>
            )

        case 'table':
            return (
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        {item.headers && (
                            <thead className="bg-muted/50">
                                <tr>
                                    {item.headers.map((header, i) => (
                                        <th
                                            key={i}
                                            className="px-3 py-2 text-left font-medium text-foreground"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                        )}
                        <tbody className="divide-y">
                            {item.rows?.map((row, i) => (
                                <tr key={i} className="hover:bg-muted/30">
                                    {row.map((cell, j) => (
                                        <td key={j} className="px-3 py-2 text-muted-foreground">
                                            {highlightText(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )

        case 'tip':
            return (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Lightbulb className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-400">
                        {highlightText(item.text || '')}
                    </p>
                </div>
            )

        case 'warning':
            return (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        {highlightText(item.text || '')}
                    </p>
                </div>
            )

        default:
            return null
    }
}

