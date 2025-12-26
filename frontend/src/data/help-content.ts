import {
    FolderOpen,
    Layers,
    Play,
    Hammer,
    Workflow,
    Keyboard,
    AlertCircle,
    Lightbulb,
    type LucideIcon,
} from 'lucide-react'

export interface HelpSection {
    id: string
    title: string
    icon: LucideIcon
    keywords: string[]
    content: HelpContent[]
}

export interface HelpContent {
    type: 'paragraph' | 'heading' | 'list' | 'code' | 'table' | 'tip' | 'warning'
    text?: string
    items?: string[]
    rows?: string[][]
    headers?: string[]
    language?: string
}

export const helpSections: HelpSection[] = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: Lightbulb,
        keywords: ['start', 'begin', 'intro', 'introduction', 'basics', 'first', 'setup'],
        content: [
            {
                type: 'paragraph',
                text: 'App Builder helps you manage, develop, and build Flutter projects with a streamlined interface.',
            },
            {
                type: 'heading',
                text: 'Quick Start',
            },
            {
                type: 'list',
                items: [
                    'Add a Project: Click the + button in the Projects section',
                    'Create an App: Select a project, then click + in the Apps section',
                    'Run or Build: Use the Build or Run tabs in the main panel',
                ],
            },
            {
                type: 'heading',
                text: 'Core Concepts',
            },
            {
                type: 'paragraph',
                text: 'Projects are your Flutter source code directories. Apps are configurations on top of projects - one project can have multiple app configurations with different names, package IDs, and icons.',
            },
        ],
    },
    {
        id: 'projects',
        title: 'Project Management',
        icon: FolderOpen,
        keywords: ['project', 'add', 'clone', 'remove', 'delete', 'clean', 'info', 'batch', 'select', 'multiple'],
        content: [
            {
                type: 'heading',
                text: 'Adding Projects',
            },
            {
                type: 'paragraph',
                text: 'Click the + button in the Projects header to add a new project.',
            },
            {
                type: 'list',
                items: [
                    'Local Project: Browse to select an existing Flutter project directory',
                    'Clone Repository: Enter a Git URL to clone and add a project',
                ],
            },
            {
                type: 'heading',
                text: 'Project Actions',
            },
            {
                type: 'paragraph',
                text: 'Hover over a project and click the ⋮ menu to access actions:',
            },
            {
                type: 'table',
                headers: ['Action', 'Description'],
                rows: [
                    ['Clean', 'Runs flutter clean to remove build artifacts'],
                    ['Info', 'Shows SDK versions, platforms, and project statistics'],
                    ['Remove', 'Removes from App Builder but keeps files on disk'],
                    ['Delete', 'Permanently deletes the project folder'],
                ],
            },
            {
                type: 'heading',
                text: 'Batch Operations',
            },
            {
                type: 'paragraph',
                text: 'Select multiple projects using checkboxes (appear on hover). Use Shift+Click for range selection. When projects are selected, a menu appears in the header for batch operations.',
            },
            {
                type: 'tip',
                text: 'Use batch Clean before major Flutter upgrades to ensure clean rebuilds.',
            },
        ],
    },
    {
        id: 'apps',
        title: 'App Configuration',
        icon: Layers,
        keywords: ['app', 'config', 'configuration', 'name', 'package', 'id', 'logo', 'icon', 'platform', 'settings'],
        content: [
            {
                type: 'heading',
                text: 'Creating an App',
            },
            {
                type: 'paragraph',
                text: 'Select a project first, then click + in the Apps section.',
            },
            {
                type: 'table',
                headers: ['Field', 'Description', 'Example'],
                rows: [
                    ['App Name', 'Display name of your app', 'My Awesome App'],
                    ['Package ID', 'Unique identifier', 'com.company.myapp'],
                    ['Platforms', 'Target platforms', 'Android, iOS, Web'],
                    ['Logo URL', 'Optional logo/icon URL', 'https://example.com/logo.png'],
                ],
            },
            {
                type: 'heading',
                text: 'Why Multiple Apps?',
            },
            {
                type: 'paragraph',
                text: 'Create different app configurations for the same project - for example, a "Free" and "Pro" version with different package IDs and icons, or separate "Staging" and "Production" configurations.',
            },
            {
                type: 'tip',
                text: 'Use workflows to automate icon replacement and other platform-specific setup.',
            },
        ],
    },
    {
        id: 'run',
        title: 'Live Development',
        icon: Play,
        keywords: ['run', 'device', 'emulator', 'simulator', 'hot', 'reload', 'restart', 'debug', 'profile', 'release', 'mode'],
        content: [
            {
                type: 'heading',
                text: 'Run Panel',
            },
            {
                type: 'paragraph',
                text: 'The Run tab provides live development with hot reload support.',
            },
            {
                type: 'heading',
                text: 'Device Selection',
            },
            {
                type: 'list',
                items: [
                    'Select a device from the dropdown',
                    'Click refresh to update the device list',
                    'Devices are filtered based on your project\'s supported platforms',
                ],
            },
            {
                type: 'heading',
                text: 'Run Modes',
            },
            {
                type: 'table',
                headers: ['Mode', 'Use Case'],
                rows: [
                    ['Debug', 'Development - full debugging, assertions enabled'],
                    ['Profile', 'Performance testing - some optimizations'],
                    ['Release', 'Final testing - full optimizations'],
                ],
            },
            {
                type: 'heading',
                text: 'Hot Reload vs Hot Restart',
            },
            {
                type: 'table',
                headers: ['Feature', 'Hot Reload (r)', 'Hot Restart (R)'],
                rows: [
                    ['Speed', 'Sub-second', 'Few seconds'],
                    ['App State', 'Preserved', 'Reset'],
                    ['Changes', 'UI and most code', 'All changes including const'],
                ],
            },
            {
                type: 'warning',
                text: 'Changes to const values require Hot Restart, not Hot Reload.',
            },
            {
                type: 'heading',
                text: 'Starting Emulators',
            },
            {
                type: 'paragraph',
                text: 'Android Emulator:',
            },
            {
                type: 'code',
                language: 'bash',
                text: 'emulator -list-avds\nemulator -avd <emulator_name>',
            },
            {
                type: 'paragraph',
                text: 'iOS Simulator (macOS):',
            },
            {
                type: 'code',
                language: 'bash',
                text: 'open -a Simulator',
            },
        ],
    },
    {
        id: 'build',
        title: 'Building for Release',
        icon: Hammer,
        keywords: ['build', 'release', 'apk', 'aab', 'ipa', 'web', 'output', 'artifact', 'history', 'download'],
        content: [
            {
                type: 'heading',
                text: 'Build Options',
            },
            {
                type: 'paragraph',
                text: 'Select platform, build type, and output format to create release artifacts.',
            },
            {
                type: 'heading',
                text: 'Output Types',
            },
            {
                type: 'table',
                headers: ['Platform', 'Output Types'],
                rows: [
                    ['Android', 'APK, App Bundle (AAB)'],
                    ['iOS', 'IPA'],
                    ['Web', 'Web Build'],
                    ['Desktop', 'Executable (macOS, Windows, Linux)'],
                ],
            },
            {
                type: 'heading',
                text: 'Build History',
            },
            {
                type: 'paragraph',
                text: 'The History tab shows all previous builds with timestamps, status, and download options. You can delete old builds to free up disk space.',
            },
            {
                type: 'tip',
                text: 'Use App Bundle (AAB) for Google Play Store submissions - it\'s required for new apps.',
            },
        ],
    },
    {
        id: 'workflows',
        title: 'Workflows',
        icon: Workflow,
        keywords: ['workflow', 'step', 'pre', 'post', 'script', 'args', 'arguments', 'android', 'setup', 'icon', 'copy', 'move'],
        content: [
            {
                type: 'heading',
                text: 'What are Workflows?',
            },
            {
                type: 'paragraph',
                text: 'Workflows automate tasks before and after builds or runs. Each platform can have separate Build and Run workflows with pre-steps and post-steps.',
            },
            {
                type: 'heading',
                text: 'Available Steps',
            },
            {
                type: 'table',
                headers: ['Step Type', 'Description'],
                rows: [
                    ['Custom Args', 'Add command-line arguments to flutter command'],
                    ['Android Setup', 'Configure Android icons via res.zip upload'],
                    ['Run Script', 'Execute custom shell commands'],
                    ['Copy Files', 'Copy files or directories'],
                    ['Move File', 'Move or rename files'],
                ],
            },
            {
                type: 'heading',
                text: 'Android Icon Setup',
            },
            {
                type: 'paragraph',
                text: 'To set up Android app icons:',
            },
            {
                type: 'list',
                items: [
                    'Generate icons at icon.kitchen or similar tool',
                    'Create a ZIP file containing the mipmap-* folders',
                    'Add an "Android Setup" step to your build workflow',
                    'Upload the res.zip file in the step configuration',
                ],
            },
            {
                type: 'tip',
                text: 'Pre-steps run before the Flutter command. If any pre-step fails, the build/run is aborted.',
            },
        ],
    },
    {
        id: 'shortcuts',
        title: 'Keyboard Shortcuts',
        icon: Keyboard,
        keywords: ['keyboard', 'shortcut', 'hotkey', 'key', 'press', 'r', 'reload', 'restart'],
        content: [
            {
                type: 'heading',
                text: 'Run Panel Shortcuts',
            },
            {
                type: 'paragraph',
                text: 'When the Run panel is focused:',
            },
            {
                type: 'table',
                headers: ['Key', 'Action'],
                rows: [
                    ['r', 'Hot Reload'],
                    ['R', 'Hot Restart'],
                ],
            },
            {
                type: 'heading',
                text: 'Global Shortcuts',
            },
            {
                type: 'table',
                headers: ['Key', 'Action'],
                rows: [
                    ['Escape', 'Close dialogs and menus'],
                    ['?', 'Open this help dialog'],
                ],
            },
        ],
    },
    {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        icon: AlertCircle,
        keywords: ['error', 'problem', 'issue', 'fix', 'troubleshoot', 'not working', 'fail', 'failed', 'help'],
        content: [
            {
                type: 'heading',
                text: 'No Devices Found',
            },
            {
                type: 'list',
                items: [
                    'Ensure Flutter is installed and in your PATH',
                    'For Android: Start an emulator or connect a device with USB debugging',
                    'For iOS: Open Xcode and start a simulator',
                    'Click the refresh button to update the list',
                ],
            },
            {
                type: 'heading',
                text: 'Build Fails',
            },
            {
                type: 'list',
                items: [
                    'Check the console for specific error messages',
                    'Run flutter doctor to diagnose issues',
                    'Try flutter clean before building',
                    'Ensure signing is configured for release builds',
                ],
            },
            {
                type: 'heading',
                text: 'Hot Reload Not Working',
            },
            {
                type: 'list',
                items: [
                    'Changes to const values require Hot Restart',
                    'Native code changes require a full rebuild',
                    'Check for syntax errors in your code',
                ],
            },
            {
                type: 'heading',
                text: 'Project Not Appearing',
            },
            {
                type: 'list',
                items: [
                    'Ensure the path contains a valid pubspec.yaml',
                    'Refresh the browser',
                    'Check the backend console for errors',
                ],
            },
            {
                type: 'warning',
                text: 'If problems persist, try restarting the backend server.',
            },
        ],
    },
]

export function searchHelp(query: string): HelpSection[] {
    if (!query.trim()) {
        return helpSections
    }

    const lowerQuery = query.toLowerCase()
    const terms = lowerQuery.split(/\s+/).filter(Boolean)

    return helpSections.filter((section) => {
        // Check title
        if (section.title.toLowerCase().includes(lowerQuery)) {
            return true
        }

        // Check keywords
        if (section.keywords.some((kw) => terms.some((term) => kw.includes(term)))) {
            return true
        }

        // Check content
        return section.content.some((item) => {
            if (item.text && item.text.toLowerCase().includes(lowerQuery)) {
                return true
            }
            if (item.items && item.items.some((i) => i.toLowerCase().includes(lowerQuery))) {
                return true
            }
            if (item.rows && item.rows.some((row) => row.some((cell) => cell.toLowerCase().includes(lowerQuery)))) {
                return true
            }
            return false
        })
    })
}

