import type { Plugin } from 'vite'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Vite plugin that injects theme initialization script into index.html
 * to prevent FOUC (Flash of Unstyled Content) on page load.
 */
export function themeInitPlugin(): Plugin {
    return {
        name: 'theme-init',
        transformIndexHtml(html) {
            // Read themes.ts to get the theme list
            const themesPath = join(__dirname, 'src/lib/themes.ts')
            const themesContent = readFileSync(themesPath, 'utf-8')

            // Extract theme IDs and their isDark values more reliably
            const themeIds: string[] = []
            const darkThemeIds: string[] = []

            // Match each theme object block
            const themePattern = /\{\s*id:\s*['"]([^'"]+)['"][\s\S]*?isDark:\s*(true|false)/g
            let match
            while ((match = themePattern.exec(themesContent)) !== null) {
                const themeId = match[1]
                const isDark = match[2] === 'true'
                themeIds.push(themeId)
                if (isDark) {
                    darkThemeIds.push(themeId)
                }
            }

            // Generate the script
            const script = `
  <script>
    // Apply theme immediately to prevent FOUC (Flash of Unstyled Content)
    (function() {
      const validThemes = ${JSON.stringify(themeIds)};
      const darkThemes = ${JSON.stringify(darkThemeIds)};
      const saved = localStorage.getItem('theme');
      let theme = 'light';
      
      if (saved && validThemes.includes(saved)) {
        theme = saved;
      } else {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          theme = 'dark';
        }
      }
      
      document.documentElement.setAttribute('data-theme', theme);
      
      // Set immediate background color for dark themes to prevent white flash
      if (darkThemes.includes(theme)) {
        document.documentElement.style.backgroundColor = '#0f172a';
        document.body.style.backgroundColor = '#0f172a';
      }
    })();
  </script>`

            // Inject before closing </head>
            return html.replace('</head>', `${script}\n</head>`)
        },
    }
}

