import { PluginContext } from '../../apps/server/src/plugins/types';

/**
 * Hook de inicialización para el plugin de ejemplo UI.
 * No requiere lógica de servidor compleja, pero es necesario para que el ERP lo active.
 */
export const init = async ({ app }: PluginContext) => {
  console.log('[Example UI Plugin] Inicializando extensión de interfaz...');

  // Podríamos inyectar rutas de API aquí si el componente UI lo necesitara.

  app.get('/api/plugins/helloWorld', (req, res) => {
    res.json({
      message: 'Hello from example plugin',
      data: [
        {
          name: 'Angel',
          lastName: 'Garcia',
          email: 'angel@gmail.com',
          phone: '123456789',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '12345',
          country: 'USA',
        },
      ],
    });
  });
};
