import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Loader, useToast, Badge } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { Tag, Plus, Trash2, Search, DollarSign, Save, X, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';

export const PriceLists: React.FC = () => {
  const { token, user } = useAuth();
  const toast = useToast();
  
  // States for Price Lists
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [newListRow, setNewListRow] = useState<{ name: string } | null>(null);
  
  // States for selected list and its prices
  const [selectedList, setSelectedList] = useState<any | null>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [searchItem, setSearchItem] = useState('');
  const [savingItems, setSavingItems] = useState<string[]>([]);
  
  const fetchLists = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pricelists', {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
      });
      const data = await res.json();
      const loadedLists = Array.isArray(data) ? data : [];
      setLists(loadedLists);
      // Auto-select first list if none selected
      if (loadedLists.length > 0 && !selectedList) {
        setSelectedList(loadedLists[0]);
        fetchPrices(loadedLists[0].id);
      }
    } catch (err) { toast.error('Error al cargar listas'); }
    finally { setLoading(false); }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items', {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchPrices = async (listId: string) => {
    setLoadingPrices(true);
    try {
      const res = await fetch(`/api/pricelists/${listId}/prices`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
      });
      const data = await res.json();
      setPrices(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoadingPrices(false); }
  };

  useEffect(() => {
    if (user?.tenantId) {
      fetchLists();
      fetchItems();
    }
  }, [user?.tenantId]);

  const handleCreateList = async () => {
    if (!newListRow?.name) return;
    try {
      const res = await fetch('/api/pricelists', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify(newListRow)
      });
      if (res.ok) {
        setNewListRow(null);
        fetchLists();
        toast.success('Lista comercial creada');
      }
    } catch (err) { toast.error('Error al crear'); }
  };

  const handleUpdateList = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/pricelists/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        setEditingListId(null);
        fetchLists();
        toast.success('Lista actualizada');
      }
    } catch (err) { toast.error('Error al actualizar'); }
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta lista de precios?')) return;
    try {
      const res = await fetch(`/api/pricelists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
      });
      if (res.ok) {
        if (selectedList?.id === id) setSelectedList(null);
        fetchLists();
        toast.success('Lista eliminada');
      }
    } catch (err) { toast.error('Error al eliminar'); }
  };

  const handleUpdatePrice = async (itemId: string, price: string) => {
    if (!selectedList || !price) return;
    setSavingItems(prev => [...prev, itemId]);
    try {
      const res = await fetch(`/api/pricelists/${selectedList.id}/prices`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || ''
        },
        body: JSON.stringify({ itemId, price: parseFloat(price) })
      });
      if (res.ok) {
        // Optimistic update or refetch
        const updatedPrice = await res.json();
        setPrices(prev => {
          const exists = prev.find(p => p.itemId === itemId);
          if (exists) return prev.map(p => p.itemId === itemId ? updatedPrice : p);
          return [...prev, updatedPrice];
        });
        toast.success('Precio actualizado');
      }
    } catch (err) { toast.error('Error al actualizar precio'); }
    finally {
      setSavingItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchItem.toLowerCase()) || 
    i.code.toLowerCase().includes(searchItem.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
               <DollarSign size={20} />
            </span>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Comercial / Pricing</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Tarifas</h1>
          <p className="text-slate-500 font-medium">Controla tus márgenes y listas de precios de forma masiva.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Master Table: Price Lists */}
        <div className="xl:col-span-4 space-y-4">
          <Card 
            noPadding 
            title="Catálogos Activos" 
            headerAction={
              <Button size="sm" onClick={() => setNewListRow({ name: '' })} disabled={!!newListRow}>
                <Plus size={14} />
              </Button>
            }
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400">
                  <th className="px-6 py-4">Nombre de la Tarifa</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {newListRow && (
                  <tr className="bg-blue-50/30">
                    <td className="px-4 py-3">
                      <Input 
                        placeholder="Ej: Mayoristas" 
                        value={newListRow.name} 
                        onChange={e => setNewListRow({ name: e.target.value })} 
                        className="h-9 text-sm"
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Button size="sm" onClick={handleCreateList}><Save size={14}/></Button>
                      <Button size="sm" variant="secondary" onClick={() => setNewListRow(null)}><X size={14}/></Button>
                    </td>
                  </tr>
                )}
                {lists.map(l => (
                  <tr 
                    key={l.id} 
                    onClick={() => { setSelectedList(l); fetchPrices(l.id); }}
                    className={`cursor-pointer transition-all group ${selectedList?.id === l.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-3">
                      {editingListId === l.id ? (
                        <Input 
                          value={l.name} 
                          onChange={e => setLists(lists.map(x => x.id === l.id ? { ...x, name: e.target.value } : x))}
                          className="h-9 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                           <div className={`p-1.5 rounded-lg transition-colors ${selectedList?.id === l.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                              <Tag size={14} />
                           </div>
                           <span className={`text-sm font-bold ${selectedList?.id === l.id ? 'text-blue-700' : 'text-slate-700'}`}>{l.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right space-x-1">
                       {editingListId === l.id ? (
                         <>
                           <Button size="sm" onClick={() => handleUpdateList(l.id, l.name)}><Save size={14}/></Button>
                           <Button size="sm" variant="secondary" onClick={() => setEditingListId(null)}><X size={14}/></Button>
                         </>
                       ) : (
                         <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setEditingListId(l.id); }} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-blue-100">
                               <Plus size={14} className="rotate-45" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteList(l.id); }} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-white rounded-lg border border-transparent hover:border-rose-100">
                               <Trash2 size={14} />
                            </button>
                         </div>
                       )}
                    </td>
                  </tr>
                ))}
                {loading && <tr><td colSpan={2} className="p-10 text-center"><Loader size="sm" /></td></tr>}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Detail Table: Prices per Item */}
        <div className="xl:col-span-8">
          {selectedList ? (
            <Card className="border-0 shadow-2xl shadow-blue-900/5 overflow-hidden" noPadding>
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <h2 className="text-xl font-black text-slate-900 leading-tight">Precios: {selectedList.name}</h2>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Asignación masiva de precios especiales</p>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    placeholder="Buscador por código o nombre..." 
                    value={searchItem}
                    onChange={(e) => setSearchItem(e.target.value)}
                    className="h-9 w-full md:w-64 pl-9 pr-4 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[800px] scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-white border-b border-slate-100 text-[9px] uppercase font-black text-slate-400 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-3">Artículo</th>
                        <th className="px-6 py-3 text-center">Precio Base</th>
                        <th className="px-6 py-3 text-center">Variación</th>
                        <th className="px-6 py-3 text-right">Precio Especial</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {filteredItems.map(item => {
                        const itemPrice = prices.find(p => p.itemId === item.id);
                        const diff = itemPrice ? ((parseFloat(itemPrice.price) / parseFloat(item.basePrice)) - 1) * 100 : 0;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                            <td className="px-6 py-3">
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 tracking-tighter uppercase">{item.code}</span>
                                  <span className="text-sm font-bold text-slate-800 leading-tight">{item.name}</span>
                               </div>
                            </td>
                            <td className="px-6 py-3 text-center">
                               <span className="font-mono text-xs font-bold text-slate-500">{item.basePrice}€</span>
                            </td>
                            <td className="px-6 py-3 text-center">
                               {itemPrice ? (
                                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter border ${diff >= 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                     {diff >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                     {Math.abs(diff).toFixed(1)}% {diff >= 0 ? 'Recargo' : 'Dcto'}
                                  </div>
                               ) : (
                                  <span className="text-slate-300 italic text-[10px]">Sin cambios</span>
                               )}
                            </td>
                            <td className="px-6 py-3 text-right">
                               <div className="flex items-center justify-end gap-2">
                                  <div className="relative w-32">
                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">€</span>
                                     <input 
                                       id={`price-input-${item.id}`}
                                       type="number"
                                       step="0.01"
                                       placeholder={item.basePrice}
                                       defaultValue={itemPrice?.price || ''}
                                       className="h-9 w-full pl-6 pr-2 rounded-lg border border-slate-100 text-xs font-black text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none text-right"
                                     />
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const input = document.getElementById(`price-input-${item.id}`) as HTMLInputElement;
                                      handleUpdatePrice(item.id, input.value);
                                    }}
                                    disabled={savingItems.includes(item.id)}
                                    className={`p-2 rounded-lg transition-all ${savingItems.includes(item.id) ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm'}`}
                                  >
                                    {savingItems.includes(item.id) ? <Loader size="sm" /> : <Save size={14} />}
                                  </button>
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-20 text-center text-slate-300 italic">No hay artículos que coincidan con la búsqueda.</td>
                        </tr>
                      )}
                   </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 bg-slate-50/50">
              <Tag size={40} className="text-slate-200 mb-4" />
              <h3 className="text-lg font-black text-slate-700 tracking-tight">Potencia Comercial</h3>
              <p className="max-w-xs text-center font-medium mt-2 text-xs text-slate-400 leading-relaxed">Selecciona una lista de la izquierda para empezar a optimizar tus márgenes de beneficio de forma masiva.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
