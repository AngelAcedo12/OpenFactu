import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PluginProvider } from './context/PluginContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from '@openfactu/ui'
import { initializeSDK } from './sdk/sdk-proxy'

// Inicializar infra compartida para plugins
initializeSDK()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <ToastProvider>
        <AuthProvider>
          <ThemeProvider>
            <PluginProvider>
              <App />
            </PluginProvider>
          </ThemeProvider>
        </AuthProvider>
      </ToastProvider>
  </React.StrictMode>,
)
