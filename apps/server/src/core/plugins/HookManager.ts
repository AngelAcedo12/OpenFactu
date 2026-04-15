import { ClientFactory } from '../tenant/ClientFactory';

type HookHandler = (context: any) => Promise<void> | void;

export class HookManager {
    private static hooks: Map<string, HookHandler[]> = new Map();

    /**
     * Registra una función para ser ejecutada en un evento específico.
     * Ejemplo: HookManager.register('salesInvoice.beforeCreate', async (ctx) => { ... })
     */
    public static register(event: string, handler: HookHandler) {
        if (!this.hooks.has(event)) {
            this.hooks.set(event, []);
        }
        this.hooks.get(event)?.push(handler);
        console.log(`[HookManager] Hook registrado para el evento: ${event}`);
    }

    /**
     * Dispara todos los hooks registrados para un evento.
     */
    public static async trigger(event: string, context: any) {
        const handlers = this.hooks.get(event) || [];
        for (const handler of handlers) {
            await handler(context);
        }
    }
}
