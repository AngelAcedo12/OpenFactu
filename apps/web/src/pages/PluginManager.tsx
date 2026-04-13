import React, { useEffect, useState } from 'react';
import { Card, Table, Badge, Button } from '@openfactu/ui';
import { Puzzle, Database, ExternalLink, RefreshCw } from 'lucide-react';

export const PluginManager: React.FC = () => {
  const [plugins, setPlugins] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pluginsRes, fieldsRes] = await Promise.all([
        fetch('/api/plugins/active'),
        fetch('/api/plugins/fields')
      ]);
      
      const pluginsData = await pluginsRes.json();
      const fieldsData = await fieldsRes.json();
      
      setPlugins(pluginsData);
      setFields(fieldsData);
    } catch (err) {
      console.error('Error fetching plugin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pluginColumns = [
    { 
      header: 'ID del Plugin', 
      accessor: (p: any) => (
        <div className="flex items-center gap-2">
          <Puzzle size={16} className="text-blue-500" />
          <span className="font-medium">{p.id}</span>
        </div>
      )
    },
    { 
      header: 'Estado', 
      accessor: (p: any) => <Badge variant="success">{p.status}</Badge> 
    },
    {
      header: 'Acciones',
      accessor: () => (
        <Button size="sm" variant="outline" onClick={() => window.open(`/api/plugins/example`, '_blank')}>
          <ExternalLink size={14} className="mr-2" />
          Probar Ruta
        </Button>
      ),
      align: 'right' as const
    }
  ];

  const fieldColumns = [
    { header: 'Plugin', accessor: 'pluginId' as const },
    { header: 'Tabla', accessor: 'tableName' as const },
    { 
      header: 'Campo', 
      accessor: (f: any) => <code className="bg-slate-100 px-1 rounded">{f.fieldName}</code> 
    },
    { header: 'Tipo', accessor: 'fieldType' as const },
    { header: 'Etiqueta', accessor: 'label' as const },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestor de Plugins</h1>
          <p className="text-slate-500">Administra y verifica los módulos de extensión del ERP.</p>
        </div>
        <Button onClick={fetchData} variant="secondary">
          <RefreshCw size={16} className={loading ? 'animate-spin mr-2' : 'mr-2'} />
          Actualizar
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <Card title="Plugins Activos" description="Lista de extensiones cargadas en el servidor.">
          <Table columns={pluginColumns} data={plugins} isLoading={loading} />
        </Card>

        <Card title="Extensiones de Base de Datos" description="Campos inyectados dinámicamente en los esquemas de tenant.">
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            <Database size={16} />
            <span>Estos campos son inyectados mediante el MigrationEngine al iniciar el plugin.</span>
          </div>
          <Table columns={fieldColumns} data={fields} isLoading={loading} />
        </Card>
      </div>
    </div>
  );
};
