import { Button, Input, Card, Table, Badge, Loader, useToast } from '@openfactu/ui';
import { Mail, Search } from 'lucide-react';
import React from 'react';

export const StyleGuide: React.FC = () => {
  const toast = useToast();
  const [showOverlayLoader, setShowOverlayLoader] = React.useState(false);

  const tableData = [
    { id: '1', name: 'Factura #001', status: 'Pagado', total: '150.00 €' },
    { id: '2', name: 'Factura #002', status: 'Pendiente', total: '2,340.50 €' },
    { id: '3', name: 'Factura #003', status: 'Error', total: '45.10 €' },
  ];

  const tableColumns = [
    { header: 'ID', accessor: 'id' as const, align: 'left' as const },
    { header: 'Nombre', accessor: 'name' as const },
    {
      header: 'Estado',
      accessor: (item: any) => (
        <Badge
          variant={
            item.status === 'Pagado' ? 'success' : item.status === 'Pendiente' ? 'warning' : 'error'
          }
        >
          {item.status}
        </Badge>
      ),
    },
    { header: 'Total', accessor: 'total' as const, align: 'right' as const },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800/50 p-8 space-y-12 pb-24">
      <header className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">ERP Design System</h1>
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">
          Librería de componentes genéricos para OpenFactu.
        </p>
      </header>

      <main className="max-w-5xl mx-auto space-y-12">
        {/* Buttons */}
        <Card
          title="Botones (Buttons)"
          subtitle="Diferentes variantes y estados para acciones globales."
        >
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Principal</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="danger">Peligro</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button isLoading>Cargando...</Button>
          </div>
        </Card>

        {/* Inputs */}
        <Card
          title="Entradas (Inputs)"
          subtitle="Campos de formulario con validación y soporte de iconos."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Email" placeholder="correo@ejemplo.com" leftIcon={<Mail size={18} />} />
            <Input
              label="Búsqueda"
              placeholder="Buscar registros..."
              leftIcon={<Search size={18} />}
            />
            <Input
              label="Campo con Error"
              error="Este campo es obligatorio"
              defaultValue="Contenido no válido"
            />
          </div>
        </Card>

        {/* Badges */}
        <Card title="Insignias (Badges)" subtitle="Etiquetas de estado con colores semánticos.">
          <div className="flex flex-wrap gap-4">
            <Badge variant="success">Éxito</Badge>
            <Badge variant="warning">Aviso</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Información</Badge>
            <Badge variant="neutral">Neutral</Badge>
          </div>
        </Card>

        {/* Loaders */}
        <Card title="Cargadores (Loaders)" subtitle="Indicadores de progreso y estados de espera.">
          <div className="flex flex-wrap items-end gap-10">
            <div className="flex flex-col items-center gap-2">
              <Loader size="sm" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">sm</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Loader size="md" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">md</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Loader size="lg" label="Cargando datos..." />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">lg</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Loader size="xl" label="Procesando..." />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">xl</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={() => {
                  setShowOverlayLoader(true);
                  setTimeout(() => setShowOverlayLoader(false), 3000);
                }}
              >
                Probar Overlay (3s)
              </Button>
              {showOverlayLoader && <Loader overlay label="Bloqueo de seguridad activo..." />}
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card
          title="Notificaciones (Toasts)"
          subtitle="Avisos dinámicos en la esquina superior derecha."
        >
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => toast.success('Operación completada con éxito')}
              variant="secondary"
              className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 border-emerald-200 hover:bg-emerald-100"
            >
              Lanzar Éxito
            </Button>
            <Button
              onClick={() => toast.error('Ha ocurrido un error inesperado')}
              variant="secondary"
              className="bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-200 border-rose-200 hover:bg-rose-100"
            >
              Lanzar Error
            </Button>
            <Button
              onClick={() => toast.warning('Tu suscripción está por expirar')}
              variant="secondary"
              className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-200 hover:bg-amber-100"
            >
              Lanzar Aviso
            </Button>
            <Button
              onClick={() => toast.info('Nueva actualización disponible')}
              variant="secondary"
              className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-200 border-blue-200 hover:bg-blue-100 dark:bg-blue-500/20"
            >
              Lanzar Info
            </Button>
          </div>
        </Card>

        {/* Tables */}
        <Card
          title="Tablas (DataTables)"
          subtitle="Estructura de datos avanzada para listados de ERP."
        >
          <Table
            columns={tableColumns}
            data={tableData}
            onRowClick={(item) => toast.info(`Seleccionado: ${item.name}`)}
          />
        </Card>
      </main>
    </div>
  );
};
