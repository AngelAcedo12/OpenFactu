/**
 * Canal WebSocket `/ws/events` para difundir eventos de negocio en tiempo real
 * al frontend. Aísla por tenant: el cliente se conecta con `?tenant=<tenantId>`
 * y solo recibe eventos de ese tenant.
 *
 * Eventos difundidos:
 *   - `salesInvoice.created`, `purchaseInvoice.created`
 *   - `salesOrder.created`, `purchaseOrder.created`
 *   - `salesDeliveryNote.created`, `purchaseDeliveryNote.created`
 *   - `payment.created`, `payment.deleted`
 *   - `journalEntry.posted`, `journalEntry.reversed`
 *   - `period.closed`
 *   - `payroll.approved`
 *
 * Patrón inspirado en `apps/server/src/plugins/devSocket.ts`.
 */
import { WebSocketServer, WebSocket } from 'ws';
import type { Server, IncomingMessage } from 'http';

export interface RealtimeEvent {
  type: string;
  payload?: any;
  timestamp?: number;
}

let wss: WebSocketServer | null = null;
const clients = new Map<string, Set<WebSocket>>();
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function addClient(tenantId: string, ws: WebSocket) {
  if (!clients.has(tenantId)) clients.set(tenantId, new Set());
  clients.get(tenantId)!.add(ws);
}

function removeClient(ws: WebSocket) {
  for (const [tenantId, set] of clients.entries()) {
    if (set.delete(ws) && set.size === 0) clients.delete(tenantId);
  }
}

export function startEventSocket(server: Server) {
  if (wss) return;
  wss = new WebSocketServer({ server, path: '/ws/events' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', 'http://localhost');
    const tenantId = url.searchParams.get('tenant');
    if (!tenantId) {
      ws.close(1008, 'missing tenant');
      return;
    }
    addClient(tenantId, ws);
    ws.send(JSON.stringify({ type: 'hello', payload: { tenantId }, timestamp: Date.now() }));

    ws.on('close', () => removeClient(ws));
    ws.on('error', () => removeClient(ws));
    // Heartbeat desde el cliente (opcional): responder pong.
    ws.on('pong', () => {
      /* alive */
    });
  });

  // Heartbeat: ping cada 30s; cierra conexiones muertas.
  heartbeatInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      try {
        (ws as any).ping();
      } catch {
        removeClient(ws);
      }
    });
  }, 30_000);

  console.log('[EventSocket] /ws/events activo');
}

/**
 * Difunde un evento a todos los clientes conectados del tenant dado.
 */
export function broadcastEvent(tenantId: string, ev: RealtimeEvent) {
  const set = clients.get(tenantId);
  if (!set || set.size === 0) return;
  const msg = JSON.stringify({ ...ev, timestamp: ev.timestamp || Date.now() });
  set.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

export function stopEventSocket() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (wss) wss.close();
  wss = null;
  clients.clear();
}
