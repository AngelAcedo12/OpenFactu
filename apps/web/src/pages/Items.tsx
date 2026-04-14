import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Loader, useToast, Badge, Modal } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, Trash2, Search, Settings2, Boxes, Scale, Tag } from 'lucide-react';

export const Items: React.FC = () => {
  const { token, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockDetailLoading, setStockDetailLoading] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<any | null>(null);
  const [stockDetail, setStockDetail] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  
  // Form State
  const [showItemModal, setShowItemModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [uomId, setUomId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [manageBy, setManageBy] = useState('N'); // N: None, B: Batch, S: Serial
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'generales' | 'logistica' | 'unidades'>('generales');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  
  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 
        Authorization: `Bearer ${token}`,
        'x-tenant-id': user?.tenantId || ''
      };
      const [iRes, cRes, uRes, zRes] = await Promise.all([
        fetch('/api/items', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/uom', { headers }),
        fetch('/api/zones', { headers })
      ]);
      const iData = await iRes.json();
      const cData = await cRes.json();
      const uData = await uRes.json();
      const zData = await zRes.json();

      setItems(Array.isArray(iData) ? iData : []);
      setCategories(Array.isArray(cData) ? cData : []);
      setUoms(Array.isArray(uData) ? uData : []);
      setZones(Array.isArray(zData) ? zData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId) fetchData();
  }, [user?.tenantId]);

  useEffect(() => {
    if (selectedItem) {
      setCode(selectedItem.code || '');
      setName(selectedItem.name || '');
      setUomId(selectedItem.uomId || '');
      setCategoryId(selectedItem.categoryId || '');
      setBasePrice(selectedItem.basePrice?.toString() || '0');
      setManageBy(selectedItem.manageBy || 'N');
      setActiveTab('generales');
    } else {
      setCode('');
      setName('');
      setUomId('');
      setCategoryId('');
      setBasePrice('0');
      setManageBy('N');
    }
  }, [selectedItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = selectedItem ? 'PATCH' : 'POST';
      const url = selectedItem ? `/api/items/${selectedItem.id}` : '/api/items';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify({ 
          code, 
          name, 
          uomId, 
          categoryId: categoryId || null, 
          basePrice: parseFloat(basePrice),
          manageBy 
        })
      });

      if (res.ok) {
        if (!selectedItem) {
          setCode('');
          setName('');
          setBasePrice('0');
        } else {
          setSelectedItem(null);
        }
        fetchData();
        toast.success(selectedItem ? 'Artículo actualizado' : 'Artículo maestro creado');
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Error en la operación');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { 
      header: 'Código / Nombre', 
      accessor: (i: any) => (
        <div className="flex flex-col">
          <span className="font-black text-blue-600 text-[10px] uppercase tracking-tighter">{i.code}</span>
          <span className="font-bold text-slate-800 text-sm leading-tight">{i.name}</span>
        </div>
      )
    },
    { 
      header: 'UoM', 
      accessor: (i: any) => {
        const uom = uoms.find(u => u.id === i.uomId);
        return <span className="font-mono text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">{uom?.symbol || '?'}</span>;
      }
    },
    { 
      header: 'Gestión', 
      accessor: (i: any) => (
        <div className="flex items-center gap-1.5">
          {i.manageBy === 'N' && <span className="p-0.5 px-1.5 bg-slate-50 text-slate-400 text-[9px] font-black rounded uppercase border border-slate-100">Std</span>}
          {i.manageBy === 'B' && <span className="p-0.5 px-1.5 bg-amber-50 text-amber-600 text-[9px] font-black rounded uppercase border border-amber-100 italic">Lote</span>}
          {i.manageBy === 'S' && <span className="p-0.5 px-1.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded uppercase border border-indigo-100 italic">Serie</span>}
        </div>
      )
    },
    { 
      header: 'Comprometido', 
      accessor: (i: any) => <span className="text-slate-400 font-mono text-[11px] font-bold">-{Number(i.committed).toFixed(2)}</span> 
    },
    { 
      header: 'Pedido', 
      accessor: (i: any) => <span className="text-blue-400 font-mono text-[11px] font-bold">+{Number(i.ordered).toFixed(2)}</span> 
    },
    { 
      header: 'Disponible', 
      accessor: (i: any) => {
        const available = Number(i.stock) - Number(i.committed) + Number(i.ordered);
        return <span className={`font-mono font-black ${available > 0 ? 'text-blue-600' : 'text-rose-600'}`}>{available.toFixed(2)}</span>
      }
    },
    { 
      header: 'Precio Base', 
      accessor: (i: any) => <span className="font-mono font-bold text-slate-600">{i.basePrice}€</span> 
    },
    { 
      header: 'Stock Total', 
      accessor: (i: any) => (
        <span className={`font-mono font-black ${i.stock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
          {i.stock.toFixed(2)}
        </span>
      )
    },
    { 
      header: 'Acciones', 
      align: 'right' as const,
      accessor: (i: any) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => handleViewStock(i)} title="Ver Inventario" className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
            <Boxes size={14} />
          </button>
          <button onClick={() => setSelectedItem(i)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
            <Settings2 size={14} />
          </button>
          <button className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  const handleViewStock = async (item: any) => {
    setSelectedStockItem(item);
    setStockDetailLoading(true);
    try {
      const res = await fetch(`/api/items/${item.id}/stock`, {
          headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
      });
      const data = await res.json();
      setStockDetail(data);
    } catch {
      toast.error('Error al cargar inventario');
    } finally {
      setStockDetailLoading(false);
    }
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tighter font-display">
            <Package className="text-blue-600" size={32} />
            Catálogo de Artículos
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Gestión de datos maestros de productos y servicios.</p>
        </div>
        <div className="relative group flex gap-4">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Buscar por código o nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 w-full shadow-sm"
            />
          </div>
        </div>
      </header>

      <div className="space-y-8">
        {/* Tabla Maestra */}
        <div>
          <Card 
            noPadding 
            title="Fichero de Artículos" 
            subtitle={`Mostrando ${filteredItems.length} registros empresariales.`}
            headerAction={
              <Button size="sm" onClick={() => { setSelectedItem(null); setShowItemModal(true); }} className="flex items-center gap-2">
                <Plus size={14} /> Nuevo
              </Button>
            }
          >
            <Table columns={columns} data={filteredItems} isLoading={loading} />
          </Card>
        </div>
      </div>

      <Modal
        isOpen={!!selectedStockItem}
        onClose={() => setSelectedStockItem(null)}
        title={`Detalle de Inventario: ${selectedStockItem?.name}`}
        subtitle="Desglose por almacenes y trazabilidad."
        maxWidth="2xl"
      >
        {stockDetailLoading ? (
          <div className="flex justify-center p-10"><Loader /></div>
        ) : (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Boxes size={12} className="text-blue-500" />
                Existencias por Almacén
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {stockDetail?.warehouseStock?.length > 0 ? stockDetail.warehouseStock.map((ws: any) => (
                   <div key={ws.warehouseId} className="p-4 bg-white rounded-xl border border-slate-200/60 shadow-sm flex justify-between items-center group hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 transition-all">
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{ws.warehouseName}</p>
                        <Badge variant="info" className="text-[8px] py-0 px-1 border-blue-100 bg-blue-50/50 text-blue-600 font-black">STOCK FÍSICO</Badge>
                      </div>
                      <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter leading-none">{Number(ws.stock).toFixed(2)}</p>
                   </div>
                 )) : (
                   <div className="col-span-2 p-8 text-center bg-slate-50/30 rounded-xl border-dashed border-2 border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                     Sin existencias físicas en ningún almacén.
                   </div>
                 )}
              </div>
            </div>

            {stockDetail?.zoneStock?.length > 0 && (
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 italic">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Package size={12} className="text-blue-500" />
                  Reparto por Ubicaciones (Zonas)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stockDetail.zoneStock.map((zs: any) => (
                    <div key={zs.zoneId} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col group hover:border-blue-400 transition-all">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{zs.zoneName}</span>
                      <div className="flex justify-between items-end">
                        <span className="text-[8px] text-slate-400 font-bold uppercase">{zs.warehouseName}</span>
                        <span className="text-xl font-black text-slate-900 font-mono tracking-tighter leading-none">{Number(zs.stock).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedStockItem?.manageBy !== 'N' && (
              <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Tag size={12} className="text-indigo-500" />
                   Trazabilidad por Lote/Serie e Ubicación
                 </h4>
                 <div className="rounded-2xl border border-slate-100 shadow-sm bg-white overflow-y-auto max-h-[350px]">
                   <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-4">Lote / Serie</th>
                          <th className="px-5 py-4">Ubicación</th>
                          <th className="px-5 py-4 text-center">Cant.</th>
                          <th className="px-5 py-4 text-right">Caducidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {stockDetail?.batches?.filter((b: any) => Number(b.quantity) > 0).map((b: any) => (
                          <tr key={b.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-5 py-3">
                              <Badge variant="neutral" className="bg-slate-100 text-slate-700 border-slate-200 font-mono text-[10px] font-black py-0 px-2">{b.batchNum}</Badge>
                            </td>
                             <td className="px-5 py-3">
                               <div className="flex flex-col">
                                 <span className="text-xs font-bold text-slate-600 leading-none">
                                   {b.zoneName || 'Stock General'}
                                 </span>
                                 <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mt-1">
                                   {b.warehouseName || stockDetail?.warehouseStock?.[0]?.warehouseName || 'Almacén Principal'}
                                 </span>
                               </div>
                             </td>
                            <td className="px-5 py-3 text-center">
                              <span className="font-mono font-black text-sm text-slate-900 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{Number(b.quantity).toFixed(2)}</span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-[10px] font-bold text-slate-400 font-mono italic">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A'}</span>
                            </td>
                          </tr>
                        ))}
                        {(!stockDetail?.batches || stockDetail.batches.filter((b: any) => Number(b.quantity) > 0).length === 0) && (
                           <tr>
                             <td colSpan={4} className="px-5 py-10 text-center text-slate-300 italic text-xs font-medium bg-slate-50/20">
                                No hay lotes o series con existencias disponibles en este momento.
                             </td>
                           </tr>
                        )}
                      </tbody>
                   </table>
                 </div>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setSelectedStockItem(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showItemModal || !!selectedItem}
        onClose={() => { setShowItemModal(false); setSelectedItem(null); }}
        title={selectedItem ? "Editar Maestro" : "Nuevo Artículo"}
        subtitle="Define las propiedades base del producto."
        maxWidth="lg"
      >
        <div className="pt-2">
          {/* Tabs del Artículo */}
          <div className="flex border-b border-slate-100 mb-6">
            <button 
              onClick={() => setActiveTab('generales')}
              className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'generales' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Gral
            </button>
            <button 
              onClick={() => setActiveTab('logistica')}
              className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'logistica' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Logística
            </button>
            <button 
              onClick={() => setActiveTab('unidades')}
              className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'unidades' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Unidades
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'generales' && (
              <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input 
                      label="Código" 
                      placeholder={categories.find(c => c.id === categoryId)?.codePrefix ? `Auto (Ej: ${categories.find(c => c.id === categoryId)?.codePrefix}-000001)` : "ART-001"} 
                      value={categories.find(c => c.id === categoryId)?.codePrefix && !selectedItem ? '' : code} 
                      disabled={!!selectedItem || !!categories.find(c => c.id === categoryId)?.codePrefix}
                      onChange={(e) => setCode(e.target.value)} 
                    />
                  </div>
                  <div className="flex-[2]">
                    <Input label="Nombre del Producto" placeholder="Ej: Laptop Pro" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Categoría (Define Prefijo)</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">-- Sin Categoría --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} {c.codePrefix ? `(${c.codePrefix}-)` : ''}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Unidad Base</label>
                  <select value={uomId} onChange={(e) => setUomId(e.target.value)} required className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">-- Seleccionar --</option>
                    {uoms.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                  </select>
                </div>


                <Input label="Precio Base (€)" type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
              </div>
            )}

            {activeTab === 'logistica' && (
              <div className="space-y-6 animate-in slide-in-from-right-2 duration-200">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                  <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 block">Trazabilidad Obligatoria</label>
                  <div className="space-y-2">
                    {[
                      { id: 'N', label: 'Gestión Estándar', desc: 'Sin control de lotes ni series.' },
                      { id: 'B', label: 'Control por Lotes', desc: 'Obligatorio en cada movimiento.' },
                      { id: 'S', label: 'Control por Series', desc: 'Identificación única del producto.' }
                    ].map(opt => (
                      <div 
                        key={opt.id}
                        onClick={() => setManageBy(opt.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${manageBy === opt.id ? 'bg-blue-600 border-blue-700 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'}`}
                      >
                        <p className="text-xs font-bold leading-none">{opt.label}</p>
                        <p className={`text-[10px] mt-1 ${manageBy === opt.id ? 'text-blue-100' : 'text-slate-400 font-medium'}`}>{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'unidades' && (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 animate-in zoom-in-95 duration-200">
                <Scale className="text-slate-300 mb-2" size={32} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Las unidades alternativas se configuran una vez creado el maestro básico.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => { setShowItemModal(false); setSelectedItem(null); }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader size="sm" variant="white" /> : (selectedItem ? "Guardar Cambios" : "Crear Artículo Maestro")}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
