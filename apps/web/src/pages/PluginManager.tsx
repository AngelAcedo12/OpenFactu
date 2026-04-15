import React, { useEffect, useState } from 'react';
import { Card, Table, Badge, Button } from '@openfactu/ui';
import { Puzzle, Database, ExternalLink, RefreshCw } from 'lucide-react';
import { PluginIcon } from '../components/PluginIcon';

export const PluginManager: React.FC = () => {
 const [plugins, setPlugins] = useState<any[]>([]);
 const [fields, setFields] = useState<any[]>([]);
 const [tables, setTables] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 const fetchData = async () => {
 setLoading(true);
 try {
 const [pluginsRes, fieldsRes, tablesRes] = await Promise.all([
 fetch('/api/plugins/active'),
 fetch('/api/plugins/fields'),
 fetch('/api/plugins/tables')
 ]);
  const pluginsData = await pluginsRes.json();
 const fieldsData = await fieldsRes.json();
 const tablesData = await tablesRes.json();
  setPlugins(pluginsData);
 setFields(fieldsData);
 setTables(tablesData);
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
 {  header: 'Plugin',  accessor: (p: any) => (
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-1.5">
 <PluginIcon iconName={p.logo} size={28} className="text-blue-500 dark:text-blue-300"/>
 </div>
 <div className="flex flex-col">
 <span className="font-black text-slate-900 dark:text-slate-100 leading-tight">{p.name || p.id}</span>
 <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{p.id}</span>
 </div>
 </div>
 )
 },
 { header: 'Versión', accessor: 'version' },
 {  header: 'Estado',  accessor: (p: any) => (
 <Badge variant={p.enabled !== false ? 'success' : 'neutral'}>
 {p.enabled !== false ? 'Activo' : 'Desactivado'}
 </Badge>
 )
 }
 ];

 const fieldColumns = [
 { header: 'Plugin', accessor: 'pluginId' },
 { header: 'Tabla Destino', accessor: 'tableName' },
 { header: 'Campo', accessor: (f: any) => <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{f.fieldName}</code> },
 { header: 'Tipo', accessor: 'fieldType' },
 { header: 'Etiqueta UI', accessor: 'label' }
 ];

 return (
 <div className="p-8 max-w-7xl mx-auto">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Gestor de Plugins</h2>
 <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Administra y monitorea las extensiones del sistema.</p>
 </div>
 <Button  variant="outline" onClick={fetchData}  disabled={loading}
 className="gap-2" >
 <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
 Refrescar Datos
 </Button>
 </div>

 <div className="grid grid-cols-1 gap-8">
 <Card title="Plugins Activos"subtitle="Lista de extensiones cargadas en el servidor.">
 <Table columns={pluginColumns} data={plugins} isLoading={loading} />
 </Card>

 <Card title="Extensiones de Base de Datos"subtitle="Campos inyectados dinámicamente en los esquemas de tenant.">
 <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-200 rounded-lg text-sm">
 <Database size={16} />
 <span>Estos campos son inyectados mediante el MigrationEngine al iniciar el plugin.</span>
 </div>
 <Table columns={fieldColumns} data={fields} isLoading={loading} />
 </Card>

 <Card title="Tablas de Plugins"subtitle="Tablas creadas íntegramente por extensiones.">
 <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 rounded-lg text-sm">
 <Database size={16} />
 <span>Tablas persistentes con prefijo pt_ gestionadas por los plugins.</span>
 </div>
 <Table  columns={[
 { header: 'Plugin', accessor: 'pluginId' },
 { header: 'Tabla', accessor: (p: any) => <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{p.tableName}</code> },
 { header: 'Definición', accessor: (p: any) => <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 dark:text-slate-500 truncate max-w-xs block">{p.definition}</span> }
 ]}  data={tables}  isLoading={loading}  />
 </Card>
 </div>
 </div>
 );
};
