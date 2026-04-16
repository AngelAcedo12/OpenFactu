import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { activePluginManifests } from './loader';

let wss: WebSocketServer | null = null;

/**
 * Inicia el WebSocket de desarrollo para hot reload de plugins.
 * Solo activo en desarrollo.
 */
export function startDevSocket(server: Server) {
  if (process.env.NODE_ENV === 'production') return;

  wss = new WebSocketServer({ server, path: '/ws/plugins' });

  wss.on('connection', (ws) => {
    console.log('[DevSocket] Cliente conectado');
    ws.on('close', () => console.log('[DevSocket] Cliente desconectado'));
  });

  console.log('[DevSocket] WebSocket de desarrollo activo en /ws/plugins');
}

/**
 * Notifica a todos los clientes que un plugin se recargo.
 */
export function broadcastPluginReload(pluginId: string) {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'plugin:reload',
    pluginId,
    manifests: activePluginManifests,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  console.log(`[DevSocket] Notificado reload de ${pluginId} a ${wss.clients.size} cliente(s)`);
}
