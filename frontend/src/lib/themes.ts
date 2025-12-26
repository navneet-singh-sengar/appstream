// Theme configuration for AppStream
// Inspired by popular IDE themes

export type ThemeId =
    | 'light'
    | 'github-light'
    | 'solarized-light'
    | 'one-light'
    | 'dark'
    | 'midnight'
    | 'nord'
    | 'dracula'
    | 'github-dark'
    | 'monokai'
    | 'solarized-dark'

export interface Theme {
    id: ThemeId
    name: string
    description: string
    isDark: boolean
    preview: {
        bg: string
        fg: string
        accent: string
    }
}

export const themes: Theme[] = [
    {
        id: 'light',
        name: 'Light',
        description: 'Clean and bright',
        isDark: false,
        preview: { bg: '#ffffff', fg: '#1a1a1a', accent: '#1a1a1a' }
    },
    {
        id: 'github-light',
        name: 'GitHub Light',
        description: 'GitHub\'s light mode',
        isDark: false,
        preview: { bg: '#ffffff', fg: '#24292f', accent: '#0969da' }
    },
    {
        id: 'solarized-light',
        name: 'Solarized Light',
        description: 'Precision colors for machines and people',
        isDark: false,
        preview: { bg: '#fdf6e3', fg: '#657b83', accent: '#268bd2' }
    },
    {
        id: 'one-light',
        name: 'One Light',
        description: 'Atom\'s One Light theme',
        isDark: false,
        preview: { bg: '#fafafa', fg: '#383a42', accent: '#4078f2' }
    },
    {
        id: 'dark',
        name: 'Dark',
        description: 'Easy on the eyes',
        isDark: true,
        preview: { bg: '#0f172a', fg: '#f8fafc', accent: '#3b82f6' }
    },
    {
        id: 'midnight',
        name: 'Midnight',
        description: 'Deep blue darkness',
        isDark: true,
        preview: { bg: '#0d1117', fg: '#c9d1d9', accent: '#58a6ff' }
    },
    {
        id: 'nord',
        name: 'Nord',
        description: 'Arctic, north-bluish',
        isDark: true,
        preview: { bg: '#2e3440', fg: '#eceff4', accent: '#88c0d0' }
    },
    {
        id: 'dracula',
        name: 'Dracula',
        description: 'Dark with purple accents',
        isDark: true,
        preview: { bg: '#282a36', fg: '#f8f8f2', accent: '#bd93f9' }
    },
    {
        id: 'github-dark',
        name: 'GitHub Dark',
        description: 'GitHub\'s dark mode',
        isDark: true,
        preview: { bg: '#0d1117', fg: '#e6edf3', accent: '#238636' }
    },
    {
        id: 'monokai',
        name: 'Monokai',
        description: 'Classic code editor theme',
        isDark: true,
        preview: { bg: '#272822', fg: '#f8f8f2', accent: '#a6e22e' }
    },
    {
        id: 'solarized-dark',
        name: 'Solarized Dark',
        description: 'Precision colors for machines and people',
        isDark: true,
        preview: { bg: '#002b36', fg: '#839496', accent: '#268bd2' }
    }
]

export function getTheme(id: ThemeId): Theme {
    return themes.find(t => t.id === id) || themes[0]
}
