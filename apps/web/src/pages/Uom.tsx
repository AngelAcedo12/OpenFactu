import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Loader, useToast } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { Hash, Plus, Trash2 } from 'lucide-react';

export const Uom: React.FC = () => {
  const { token, user } = useAuth();
  const [uoms, setUoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const fetchUoms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/uom', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        }
      });
      const data = await res.json();
      setUoms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId) fetchUoms();
  }, [user?.tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/uom', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify({ name, symbol })
      });
      if (res.ok) {
        setName('');
        setSymbol('');
        fetchUoms();
        toast.success('Unidad creada');
      }
    } catch (err) {
      toast.error('Error al crear');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/uom/${id}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        }
      });
      if (res.ok) {
        fetchUoms();
        toast.success('Unidad eliminada');
      }
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const columns = [
    { header: 'Nombre', accessor: 'name' },
    { header: 'Símbolo', accessor: (u: any) => <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">{u.symbol}</span> },
    { 
      header: 'Acciones', 
      accessor: (u: any) => (
        <button onClick={() => handleDelete(u.id)} className="text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <Hash className="text-blue-600" size={32} />
          Unidades de Medida
        </h1>
        <p className="text-slate-500 mt-1 font-medium">Define cómo mides tus productos (unidades, kg, horas, etc.).</p>
      </div>

      <Card className="p-6 border-blue-50 shadow-lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            placeholder="Nombre (ej: Kilogramos)" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="md:col-span-1"
          />
          <Input 
            placeholder="Símbolo (ej: kg)" 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            required
            className="md:col-span-1"
          />
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2 w-full">
            {isSubmitting ? <Loader size="sm" variant="white" /> : <Plus size={18} />}
            Añadir Unidad
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden shadow-xl border-slate-100">
        <Table columns={columns} data={uoms} isLoading={loading} />
      </Card>
    </div>
  );
};
