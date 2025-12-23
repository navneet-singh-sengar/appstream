import { createBrowserRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import { AppLayout } from '@/components/layout'

function RootLayout() {
    return (
        <ToastProvider>
            <AppLayout />
        </ToastProvider>
    )
}

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
    },
    {
        path: '/project/:projectId',
        element: <RootLayout />,
    },
    {
        path: '/project/:projectId/app/:appId',
        element: <RootLayout />,
    },
])
