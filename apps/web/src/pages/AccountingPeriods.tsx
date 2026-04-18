import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Loader, useToast, Badge } from '@openfactu/ui';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Trash2 } from 'lucide-react';

export const AccountingPeriods: React.FC = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const canWrite =
    user?.role === 'SUPERUSER' ||
    user?.role === 'ADMIN' ||
    user?.permissions?.[location.pathname]?.write;
  const canDelete =
    user?.role === 'SUPERUSER' ||
    user?.role === 'ADMIN' ||
    user?.permissions?.[location.pathname]?.delete;
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/periods', {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' },
      });
      const data = await res.json();
      setPeriods(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId) fetchPeriods();
  }, [user?.tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || '',
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          name,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          status: 'O',
        }),
      });
      if (res.ok) {
        setCode('');
        setName('');
        setStartDate('');
        setEndDate('');
        fetchPeriods();
        toast.success('Periodo creado correctamente');
      } else {
        const d = await res.json();
        toast.error(`Error: ${d.error}`);
      }
    } catch (err) {
      toast.error('Error al crear Periodo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/periods/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' },
      });
      if (res.ok) {
        fetchPeriods();
        toast.success('Periodo eliminado');
      }
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const columns = [
    { header: 'Código', accessor: 'code' },
    { header: 'Nombre', accessor: 'name' },
    { header: 'Inicio', cell: (c: any) => new Date(c.startDate).toLocaleDateString() },
    { header: 'Fin', cell: (c: any) => new Date(c.endDate).toLocaleDateString() },
    {
      header: 'Estado',
      cell: (c: any) =>
        c.status === 'O' ? (
          <Badge variant="success">Abierto</Badge>
        ) : (
          <Badge variant="neutral">Cerrado</Badge>
        ),
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      cell: (c: any) => (
        <button
          onClick={() => canDelete && handleDelete(c.id)}
          disabled={!canDelete}
          className={`transition-colors ${canDelete ? 'text-slate-400 dark:text-slate-500 hover:text-red-500' : 'text-slate-100 cursor-not-allowed grayscale'}`}
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
          <Calendar className="text-blue-600 dark:text-blue-300" size={32} />
          Periodos Contables
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Define los ejercicios o años fiscales para acotar la contabilidad y series.
        </p>
      </div>

      <Card className="p-6 border-blue-50 shadow-lg" noPadding>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-[1]">
            <Input
              placeholder="Code (Ej: 2024)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <div className="flex-[2]">
            <Input
              placeholder="Nombre (Ej: Ejercicio 2024)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !canWrite}
            className="flex items-center gap-2 disabled:opacity-50 disabled:grayscale transition-all"
          >
            {isSubmitting ? <Loader size="sm" variant="white" /> : <Plus size={18} />}
            Crear
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden border-slate-100 dark:border-slate-800" noPadding>
        <Table columns={columns} data={periods} isLoading={loading} />
      </Card>
    </div>
  );
};
