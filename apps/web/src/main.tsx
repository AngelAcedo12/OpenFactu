import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PluginProvider } from './context/PluginContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from '@openfactu/ui'
import { initializeSDK } from './sdk/sdk-proxy'

// Inicializar infra compartida para plugins
initializeSDK()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <ToastProvider>
        <AuthProvider>
          <PluginProvider>
            <App />
          </PluginProvider>
        </AuthProvider>
      </ToastProvider>
  </React.StrictMode>,
)
