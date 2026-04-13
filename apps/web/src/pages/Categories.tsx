import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Loader, useToast } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { Layers, Plus, Trash2 } from 'lucide-react';

export const Categories: React.FC = () => {
  const { token, user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        }
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId) fetchCategories();
  }, [user?.tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify({ name, parentId: parentId || null })
      });
      if (res.ok) {
        setName('');
        setParentId('');
        fetchCategories();
        toast.success('Categoría creada');
      }
    } catch (err) {
      toast.error('Error al crear');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        }
      });
      if (res.ok) {
        fetchCategories();
        toast.success('Categoría eliminada');
      }
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const columns = [
    { header: 'Nombre', accessor: 'name' },
    { 
      header: 'Pertenece a', 
      accessor: (c: any) => categories.find(p => p.id === c.parentId)?.name || '-' 
    },
    { 
      header: 'Acciones', 
      accessor: (c: any) => (
        <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <Layers className="text-blue-600" size={32} />
          Categorías
        </h1>
        <p className="text-slate-500 mt-1 font-medium">Clasifica tus artículos con categorías y subcategorías.</p>
      </div>

      <Card className="p-6 border-blue-50 shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input 
              placeholder="Nombre (ej: Procesadores)" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <select 
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Es Categoría Principal</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader size="sm" variant="white" /> : <Plus size={18} />}
            Añadir
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden shadow-xl border-slate-100">
        <Table columns={columns} data={categories} isLoading={loading} />
      </Card>
    </div>
  );
};
