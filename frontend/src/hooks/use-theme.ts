import { useState, useCallback, useEffect } from 'react'
import { type ThemeId, themes, getTheme } from '@/lib/themes'

export function useTheme() {
    const [themeId, setThemeId] = useState<ThemeId>(() => {
        // Check for saved preference or system preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme') as ThemeId | null
            if (saved && themes.some(t => t.id === saved)) return saved
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }
        return 'light'
    })

    const theme = getTheme(themeId)
    const isDark = theme.isDark

    useEffect(() => {
        // Set the data-theme attribute on the document element
        document.documentElement.setAttribute('data-theme', themeId)

        // Save preference
        localStorage.setItem('theme', themeId)
    }, [themeId])

    const setTheme = useCallback((id: ThemeId) => {
        setThemeId(id)
    }, [])

    const toggleTheme = useCallback(() => {
        setThemeId((prev) => (prev === 'light' ? 'dark' : 'light'))
    }, [])

    return {
        theme,
        themeId,
        isDark,
        setTheme,
        toggleTheme,
        availableThemes: themes,
    }
}
