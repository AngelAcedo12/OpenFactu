import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Badge, Loader, useToast } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, Search, Edit2, Trash2, Tag, DollarSign, Barcode } from 'lucide-react';

export const Items: React.FC = () => {
  const { token, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);

  // Estado del formulario
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    barcode: '',
    categoryId: '',
    uomId: '',
    salePrice: '0',
    purchasePrice: '0',
    isActive: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/items', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        }
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching items', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' };
      const [catRes, uomRes] = await Promise.all([
        fetch('/api/categories', { headers }),
        fetch('/api/uom', { headers })
      ]);
      const [cats, units] = await Promise.all([catRes.json(), uomRes.json()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setUoms(Array.isArray(units) ? units : []);
    } catch (err) {
      console.error('Error fetching metadata', err);
    }
  };

  useEffect(() => {
    if (user?.tenantId) {
      fetchItems();
      fetchMetadata();
    }
  }, [user?.tenantId]);

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      barcode: '',
      categoryId: '',
      uomId: '',
      salePrice: '0',
      purchasePrice: '0',
      isActive: true
    });
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      barcode: item.barcode || '',
      categoryId: item.categoryId || '',
      uomId: item.uomId || '',
      salePrice: item.salePrice.toString(),
      purchasePrice: item.purchasePrice.toString(),
      isActive: item.isActive
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingItem ? `/api/items/${editingItem.id}` : '/api/items';
      const method = editingItem ? 'PATCH' : 'POST';
      
      const payload = {
        ...formData,
        categoryId: formData.categoryId || null,
        uomId: formData.uomId || null,
        salePrice: parseFloat(formData.salePrice),
        purchasePrice: parseFloat(formData.purchasePrice)
      };

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        resetForm();
        fetchItems();
        toast.success(editingItem ? 'Artículo actualizado' : 'Artículo creado');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fallo en la operación');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este artículo?')) return;
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        }
      });
      if (res.ok) {
        fetchItems();
        toast.success('Artículo eliminado');
      }
    } catch (err) {
      toast.error('Fallo al eliminar');
    }
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { 
      header: 'Código', 
      accessor: (i: any) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">{i.code}</span>
          <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <Barcode size={10} /> {i.barcode || 'S/G'}
          </span>
        </div>
      )
    },
    { 
      header: 'Producto', 
      accessor: (i: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{i.name}</span>
          <span className="text-xs text-slate-500 line-clamp-1">{i.description || 'Sin descripción'}</span>
        </div>
      )
    },
    { 
      header: 'Precio Venta', 
      accessor: (i: any) => (
        <span className="font-bold text-slate-900">{parseFloat(i.salePrice).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
      )
    },
    { 
      header: 'Estado', 
      accessor: (i: any) => (
        <Badge variant={i.isActive ? 'success' : 'neutral'}>
          {i.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    { 
      header: 'Acciones', 
      accessor: (i: any) => (
        <div className="flex gap-2">
          <button onClick={() => startEdit(i)} className="p-1 hover:text-blue-600 transition-colors">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(i.id)} className="p-1 hover:text-red-600 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (!user?.tenantId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Tag size={32} />
          </div>
          <h2 className="text-xl font-bold">Acceso Global Requerido</h2>
          <p className="text-slate-500">Para gestionar artículos debes estar dentro del contexto de una empresa específica. Por favor, selecciona una empresa en el login.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Package className="text-blue-600" size={32} />
            Catálogo de Artículos
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Gestiona tu inventario, precios y productos.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Buscar por nombre o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <Plus size={18} />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? `Editando: ${editingItem.name}` : "Nuevo Producto"} className="border-blue-100 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Código de Referencia</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Tag size={16} />
                  </div>
                  <Input 
                    placeholder="ART-001"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del Producto</label>
                <Input 
                  placeholder="Ej: Laptop Pro 16"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                <Input 
                  placeholder="Detalles del producto, especificaciones, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                <select 
                  value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Seleccionar Categoría...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Unidad de Medida</label>
                <select 
                  value={formData.uomId}
                  onChange={(e) => setFormData({...formData, uomId: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Seleccionar Unidad...</option>
                  {uoms.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Código de Barras (EAN)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Barcode size={16} />
                  </div>
                  <Input 
                    placeholder="84123..."
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Precio Compra (€)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <DollarSign size={16} />
                  </div>
                  <Input 
                    type="number" step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 font-black text-blue-600">Precio Venta (€)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-blue-500">
                    <DollarSign size={16} />
                  </div>
                  <Input 
                    type="number" step="0.01"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                    required
                    className="pl-10 border-blue-200 focus:ring-blue-500 focus:border-blue-500 font-bold"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-6 border-t border-slate-100">
              <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="px-8 flex items-center gap-2">
                {isSubmitting && <Loader size="sm" variant="white" />}
                {editingItem ? 'Actualizar Producto' : 'Guardar Producto'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden border-slate-100 shadow-xl">
        <Table columns={columns} data={filteredItems} isLoading={loading} />
        {!loading && filteredItems.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            {searchTerm ? 'No se encontraron artículos con ese nombre.' : 'Aún no tienes artículos en tu catálogo.'}
          </div>
        )}
      </Card>
    </div>
  );
};
