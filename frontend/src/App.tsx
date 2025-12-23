import { ToastProvider } from '@/components/ui/toast'
import { AppLayout } from '@/components/layout'

function App() {
  return (
    <ToastProvider>
      <AppLayout />
    </ToastProvider>
  )
}

export default App
