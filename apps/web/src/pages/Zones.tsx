import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Loader, useToast } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, Plus, Trash2, ArrowLeft, Save, X, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Zones: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<any | null>(null);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/zones', {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
      });
      const data = await res.json();
      setZones(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Error al cargar zonas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId) fetchZones();
  }, [user?.tenantId]);

  const handleCreate = async () => {
    if (!newRow?.name) return;
    try {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify(newRow)
      });
      if (res.ok) {
        setNewRow(null);
        fetchZones();
        toast.success('Zona creada');
      }
    } catch {
      toast.error('Error al crear');
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      const res = await fetch(`/api/zones/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setEditingId(null);
        fetchZones();
        toast.success('Zona actualizada');
      }
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta zona?')) return;
    try {
      const res = await fetch(`/api/zones/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
      });
      if (res.ok) {
        fetchZones();
        toast.success('Zona eliminada');
      }
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/warehouses')}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                 <LayoutGrid size={20} />
              </span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Logística / Almacenes</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight text-display">Zonas Logísticas</h1>
            <p className="text-slate-500 font-medium">Agrupaciones territoriales para la gestión de stock y pasillos.</p>
          </div>
        </div>
        <Button onClick={() => setNewRow({ name: '', description: '' })} disabled={!!newRow} className="flex items-center gap-2 shadow-xl shadow-blue-100">
          <Plus size={18} /> Nueva Zona
        </Button>
      </header>

      <Card className="overflow-hidden border-0 shadow-2xl shadow-slate-200/50" noPadding>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400">
              <th className="px-6 py-4">Información de Zona</th>
              <th className="px-6 py-4">Descripción</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {newRow && (
              <tr className="bg-blue-50/30 animate-in zoom-in-95 duration-200">
                <td className="px-4 py-3">
                  <Input placeholder="Nombre de Zona" value={newRow.name} onChange={e => setNewRow({ ...newRow, name: e.target.value })} className="h-9 text-sm" />
                </td>
                <td className="px-4 py-3">
                  <Input placeholder="Descripción (opcional)" value={newRow.description} onChange={e => setNewRow({ ...newRow, description: e.target.value })} className="h-9 text-sm" />
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Button size="sm" onClick={handleCreate}><Save size={14} className="mr-2"/> Guardar</Button>
                  <Button size="sm" variant="secondary" onClick={() => setNewRow(null)}><X size={14}/></Button>
                </td>
              </tr>
            )}

            {zones.map(z => (
              <tr key={z.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-3">
                  {editingId === z.id ? (
                    <Input value={z.name} onChange={e => setZones(zones.map(x => x.id === z.id ? { ...x, name: e.target.value } : x))} className="h-9 text-sm" />
                  ) : (
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <MapPin size={16} />
                       </div>
                       <p className="font-bold text-slate-800 text-sm leading-tight">{z.name}</p>
                    </div>
                  )}
                </td>
                <td className="px-6 py-3">
                  {editingId === z.id ? (
                    <Input value={z.description || ''} onChange={e => setZones(zones.map(x => x.id === z.id ? { ...x, description: e.target.value } : x))} className="h-9 text-sm" />
                  ) : (
                    <p className="text-slate-500 text-xs font-medium">{z.description || <span className="text-slate-300 italic">Sin descripción</span>}</p>
                  )}
                </td>
                <td className="px-6 py-3 text-right space-x-1">
                  {editingId === z.id ? (
                    <>
                      <Button size="sm" onClick={() => handleUpdate(z.id, z)}><Save size={14} className="mr-2"/> Aplicar</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}><X size={14}/></Button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingId(z.id)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Plus size={16} className="rotate-45" /></button>
                      <button onClick={() => handleDelete(z.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
