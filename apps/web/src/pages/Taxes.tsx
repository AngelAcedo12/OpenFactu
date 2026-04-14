import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Loader, useToast, Badge } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { Percent, Plus, Trash2, Edit3, Save, X, Info } from 'lucide-react';

export const Taxes: React.FC = () => {
  const { token, user } = useAuth();
  const toast = useToast();
  
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<{ code: string; rate: string } | null>(null);

  const fetchTaxes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/taxes', {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
      });
      const data = await res.json();
      setTaxes(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Error al cargar impuestos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId) {
      fetchTaxes();
    }
  }, [user?.tenantId]);

  const handleCreate = async () => {
    if (!newRow || !newRow.code || !newRow.rate) return;
    try {
      const res = await fetch('/api/taxes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify(newRow)
      });
      if (!res.ok) throw new Error();
      toast.success('Impuesto creado');
      setNewRow(null);
      fetchTaxes();
    } catch {
      toast.error('Error al crear impuesto');
    }
  };

  const handleUpdate = async (id: string, code: string, rate: string) => {
    try {
      const res = await fetch(`/api/taxes/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify({ code, rate })
      });
      if (!res.ok) throw new Error();
      toast.success('Impuesto actualizado');
      setEditingId(null);
      fetchTaxes();
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este tipo de IVA? Esto podría afectar a los documentos que lo usen.')) return;
    try {
      const res = await fetch(`/api/taxes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
      });
      if (!res.ok) throw new Error();
      toast.success('Impuesto eliminado');
      fetchTaxes();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-amber-600 rounded-lg text-white shadow-lg shadow-amber-200">
               <Percent size={20} />
            </span>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Finanzas / Configuración</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Impuestos</h1>
          <p className="text-slate-500 font-medium">Configura los tipos de IVA y retenciones aplicables a tus documentos.</p>
        </div>
        <Button onClick={() => setNewRow({ code: '', rate: '' })} disabled={!!newRow} className="flex items-center gap-2 shadow-xl shadow-blue-100">
          <Plus size={18} /> Nuevo Impuesto
        </Button>
      </header>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4 text-blue-800">
         <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
            <Info size={20} />
         </div>
         <div className="text-sm">
            <p className="font-black uppercase text-[10px] mb-1">Nota importante</p>
            <p className="font-medium opacity-80">Los impuestos definidos aquí aparecerán automáticamente en la selección de líneas de Pedidos, Albaranes y Facturas. El sistema calculará la cuota de IVA basándose en el porcentaje aquí definido.</p>
         </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-2xl shadow-slate-200/50" noPadding>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400">
              <th className="p-6">Código / Identificador</th>
              <th className="p-6 text-center">Porcentaje (%)</th>
              <th className="p-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* New Row Placeholder */}
            {newRow && (
              <tr className="bg-blue-50/30 animate-in zoom-in-95 duration-200">
                <td className="p-4">
                  <Input 
                    placeholder="Ej: IVA_21" 
                    value={newRow.code} 
                    onChange={e => setNewRow({ ...newRow, code: e.target.value })}
                    className="h-10 border-blue-200 focus:border-blue-500 bg-white"
                  />
                </td>
                <td className="p-4">
                  <Input 
                    type="number" 
                    placeholder="21" 
                    value={newRow.rate} 
                    onChange={e => setNewRow({ ...newRow, rate: e.target.value })}
                    className="h-10 text-center border-blue-200 focus:border-blue-500 bg-white"
                  />
                </td>
                <td className="p-4 text-right space-x-2">
                  <Button size="sm" onClick={handleCreate} className="h-10 gap-2"><Save size={14}/> Guardar</Button>
                  <Button size="sm" variant="secondary" onClick={() => setNewRow(null)} className="h-10 text-slate-400 hover:text-rose-500"><X size={14}/></Button>
                </td>
              </tr>
            )}

            {taxes.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-6">
                  {editingId === t.id ? (
                    <Input 
                      value={t.code} 
                      onChange={e => setTaxes(taxes.map(x => x.id === t.id ? { ...x, code: e.target.value } : x))}
                      className="h-10 border-slate-200 focus:border-blue-500"
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                          <Percent size={18} />
                       </div>
                       <div>
                          <p className="font-black text-slate-800">{t.code}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Identificador Maestro</p>
                       </div>
                    </div>
                  )}
                </td>
                <td className="p-6 text-center">
                  {editingId === t.id ? (
                    <Input 
                      type="number"
                      value={t.rate} 
                      onChange={e => setTaxes(taxes.map(x => x.id === t.id ? { ...x, rate: e.target.value } : x))}
                      className="h-10 text-center border-slate-200 focus:border-blue-500"
                    />
                  ) : (
                    <Badge variant="neutral" className="text-lg py-1 px-3 bg-slate-100 text-slate-700 border-slate-200 h-9">
                      {t.rate}%
                    </Badge>
                  )}
                </td>
                <td className="p-6 text-right space-x-2">
                  {editingId === t.id ? (
                    <>
                      <Button size="sm" onClick={() => handleUpdate(t.id, t.code, t.rate)} className="h-10 gap-2"><Save size={14}/> Aplicar</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)} className="h-10"><X size={14}/></Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => setEditingId(t.id)} 
                        className="h-10 border-transparent hover:bg-amber-50 hover:text-amber-600 transition-all"
                      >
                        <Edit3 size={16} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleDelete(t.id)} 
                        className="h-10 border-transparent hover:bg-rose-50 hover:text-rose-600 transition-all"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {!loading && taxes.length === 0 && !newRow && (
              <tr>
                <td colSpan={3} className="p-20 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                       <Percent size={32} />
                    </div>
                    <p className="font-medium">No hay impuestos definidos todavía.</p>
                    <Button variant="secondary" onClick={() => setNewRow({ code: '', rate: '' })}>Configurar el primer impuesto</Button>
                  </div>
                </td>
              </tr>
            )}
            
            {loading && (
               <tr>
                 <td colSpan={3} className="p-20 text-center">
                    <Loader size="lg" />
                    <p className="text-slate-400 mt-4 font-medium italic">Sincronizando con el servidor...</p>
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
