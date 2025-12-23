import { useState, useCallback, useEffect } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        // Check for saved preference or system preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme') as Theme | null
            if (saved) return saved
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }
        return 'light'
    })

    const isDark = theme === 'dark'

    useEffect(() => {
        // Apply theme class to document
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        // Save preference
        localStorage.setItem('theme', theme)
    }, [theme, isDark])

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    }, [])

    const setLightTheme = useCallback(() => setTheme('light'), [])
    const setDarkTheme = useCallback(() => setTheme('dark'), [])

    return {
        theme,
        isDark,
        toggleTheme,
        setLightTheme,
        setDarkTheme,
    }
}

