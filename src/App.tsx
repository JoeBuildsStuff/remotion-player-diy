import { Editor } from '@/components/editor'
import { ThemeProvider } from '@/components/theme-provider'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Editor />
    </ThemeProvider>
  )
}

export default App
