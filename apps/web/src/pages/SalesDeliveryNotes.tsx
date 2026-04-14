import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Loader, useToast, Badge, FilterBar, SearchableSelect } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { Truck, Plus, Trash2, ArrowLeft, Save, Copy, PlusSquare, Barcode, ShoppingCart } from 'lucide-react';
import { BatchSelectionModal } from '../components/BatchSelectionModal';
import { useDocument, useDataTable } from '@openfactu/common';

// --- Sub-componente: VISTA DE LISTADO ---
const SDNList: React.FC<{
  data: any[];
  loading: boolean;
  partners: any[];
  onCreate: () => void;
  onDetail: (sdn: any) => void;
  onCopyToInvoice: (sdn: any) => void;
}> = ({ data, loading, partners, onCreate, onDetail, onCopyToInvoice }) => {
  const { filteredData, searchTerm, setSearchTerm, activeFilters, setFilter, clearFilters } = useDataTable({ 
    data,
    searchColumns: ['docCode', 'orderCode', 'partnerName', 'total'] as any,
    filters: [
      { key: 'partnerId', type: 'select', label: 'Cliente', options: partners.map(p => ({ label: p.name, value: p.id })) },
      { key: 'status', type: 'select', label: 'Estado', options: [
        { label: 'Abierto', value: 'O' }, { label: 'Facturado', value: 'C' }, { label: 'Cancelado', value: 'X' }
      ]},
      { key: 'date', type: 'date', label: 'Fecha' }
    ]
  });

  const columns = [
    { header: 'No. Albarán', accessor: (item: any) => (
      <div className="flex flex-col">
        <span className="font-bold text-slate-900 leading-none">{item.seriesPrefix}-{item.periodCode}-{String(item.docNum).padStart(6, '0')}</span>
        <span className="text-[10px] text-slate-400 font-mono mt-1">ID: {item.id.substring(0,8)}</span>
      </div>
    )},
    { header: 'Fecha', accessor: (item: any) => new Date(item.date).toLocaleDateString() },
    { header: 'Cliente', accessor: (item: any) => item.partnerName || partners.find(p => p.id === item.partnerId)?.name || '...' },
    { header: 'Pedido Origen', accessor: (item: any) => item.orderDocNum ? (
      <Badge variant="info" className="font-mono text-[10px] opacity-80">
        {item.orderPrefix}-{item.periodCode}-{String(item.orderDocNum).padStart(6, '0')}
      </Badge>
    ) : '-' },
    { header: 'Total', align: 'right' as const, accessor: (item: any) => <span className="font-black text-slate-900">{Number(item.total).toFixed(2)} €</span> },
    { header: 'Estado', align: 'center' as const, cell: (item: any) => (
      <>
        {item.status === 'O' && <Badge variant="warning">Abierto</Badge>}
        {item.status === 'C' && <Badge variant="success">Facturado</Badge>}
        {item.status === 'X' && <Badge variant="error">Cancelado</Badge>}
      </>
    )},
    { header: 'Acciones', align: 'right' as const, cell: (item: any) => (
      <div className="flex items-center justify-end gap-2">
        {item.status === 'O' && (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onCopyToInvoice(item); }} className="text-blue-600 font-bold hover:bg-blue-50 gap-1 uppercase text-[10px]">
            <Copy size={12} /> Facturar
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onDetail(item); }}>Ver</Button>
      </div>
    )}
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tighter">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100">
              <Truck size={32} />
            </div>
            Salidas (Albaranes)
          </h1>
          <p className="text-slate-500 mt-2 font-medium ml-1">Registro físico de salida de productos y control de expedición.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={onCreate} className="flex items-center gap-2 shadow-xl shadow-emerald-500/10 h-12 px-6 bg-emerald-600 hover:bg-emerald-700">
            <Plus size={20} /> Registrar Nueva Salida
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden shadow-xl" noPadding>
        <FilterBar 
           searchTerm={searchTerm} onSearchChange={setSearchTerm}
           activeFilters={activeFilters} onFilterChange={setFilter} onClear={clearFilters}
           config={[
             { key: 'partnerId', label: 'Cliente', type: 'select', options: partners.map(p => ({ label: p.name, value: p.id })) },
             { key: 'status', label: 'Estado', type: 'select', options: [
               { label: 'Abierto', value: 'O' }, { label: 'Facturado', value: 'C' }, { label: 'Cancelado', value: 'X' }
             ]},
             { key: 'date', label: 'Fecha', type: 'date' }
           ]}
           searchPlaceholder="Buscar albarán..."
        />
        <Table columns={columns} data={filteredData || []} isLoading={loading} onRowClick={onDetail} />
      </Card>
    </div>
  );
};

// --- Sub-componente: VISTA DE FORMULARIO ---
const SDNForm: React.FC<{
  onBack: () => void;
  onSubmit: (e: any) => void;
  state: any;
  setState: any;
  masters: any;
  actions: any;
  computations: any;
  zones: any[];
  orderId: string | null;
  setViewingBatch: (l: any) => void;
}> = ({ onBack, onSubmit, state, setState, masters, actions, computations, zones, orderId, setViewingBatch }) => {
  const [batchEditingIdx, setBatchEditingIdx] = useState<number | null>(null);

  const columns = [
    { header: 'Artículo', cell: (l: any, idx: number) => {
      const item = masters.items.find((i: any) => i.id === l.itemId);
      const hasTrace = l.batchDetails?.length > 0;
      return (
        <div className="space-y-2">
          <SearchableSelect
            value={l.itemId}
            onChange={(val) => actions.updateLine(idx, 'itemId', val)}
            options={masters.items.map((i: any) => ({ label: `[${i.code}] ${i.name}`, value: i.id }))}
            placeholder="Seleccionar artículo..."
          />
          {item?.manageBy !== 'N' && l.itemId && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setBatchEditingIdx(idx)} className="text-[10px] text-indigo-600 font-black uppercase p-0 h-auto hover:bg-transparent hover:text-indigo-800 flex items-center gap-1">
                {hasTrace ? <Barcode size={12} className="text-emerald-500" /> : <Plus size={12} />}
                {hasTrace ? `${item?.manageBy === 'S' ? 'Series' : 'Lotes'} (${l.batchDetails.length})` : 'Asignar Trazabilidad'}
              </Button>
            </div>
          )}
        </div>
      );
    }, width: '30%' },
    { header: 'Ubicación', cell: (l: any, idx: number) => (
      <select 
        value={l.zoneId || ''} 
        onChange={e => actions.updateLine(idx, 'zoneId', e.target.value)} 
        className="w-full h-9 text-xs font-bold border-slate-200 rounded-lg bg-slate-50"
      >
        <option value="">(Sin Ubicación)</option>
        {zones.filter(z => z.warehouseId === (l.warehouseId || state.warehouseId)).map(z => (
          <option key={z.id} value={z.id}>{z.name}</option>
        ))}
      </select>
    ), width: '15%' },
    { header: 'Cant.', align: 'center' as const, cell: (l: any, idx: number) => (
      <Input type="number" value={l.quantity} onChange={e => actions.updateLine(idx, 'quantity', e.target.value)} className="w-20 text-center font-black h-9" />
    ), width: '10%' },
    { header: 'Precio', align: 'right' as const, accessor: (l: any) => Number(l.price).toFixed(2) + ' €', width: '12%' },
    { header: '% IVA', align: 'center' as const, cell: (l: any, idx: number) => (
      <select 
        value={l.taxGroupId || ''} 
        onChange={e => actions.updateLine(idx, 'taxGroupId', e.target.value)} 
        className="h-9 w-20 border border-slate-200 rounded-lg text-xs font-bold text-center bg-slate-50"
      >
        <option value="">0%</option>
        {masters.taxGroups.map((t: any) => <option key={t.id} value={t.id}>{t.rate}%</option>)}
      </select>
    ), width: '10%' },
    { header: 'Total', align: 'right' as const, cell: (l: any) => (
      <span className="font-black text-slate-900">
        {(() => {
          const tax = masters.taxGroups.find((t: any) => t.id === l.taxGroupId);
          const rate = tax ? Number(tax.rate) : 0;
          const base = (Number(l.quantity || 0) * Number(l.price || 0));
          return (base * (1 + rate / 100)).toFixed(2);
        })()} €
      </span>
    ), width: '15%' },
    { header: '', align: 'center' as const, cell: (_: any, idx: number) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => actions.removeLine(idx)} className="text-slate-300 hover:text-rose-500">
          <Trash2 size={16} />
        </Button>
      </div>
    ), width: '8%' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
              Registro de Salida
              {orderId && <Badge variant="info" className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-600 border-blue-100 italic">De Pedido</Badge>}
            </h1>
            <p className="text-slate-500 mt-1 font-medium ml-1 flex items-center gap-2">
              <PlusSquare size={14} className="text-emerald-500" />
              Documento de expedición y control de stock de salida.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button onClick={onSubmit} isLoading={state.isSubmitting} disabled={!!state.seriesError} className="flex items-center gap-2 shadow-xl shadow-blue-500/10 h-12 px-8">
             <Save size={20} /> Registrar Albarán
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 space-y-6 shadow-xl border-t-4 border-t-emerald-500">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Cliente *</label>
                <SearchableSelect
                  value={state.partnerId}
                  onChange={setState.setPartnerId}
                  options={masters.partners.map((p: any) => ({ label: p.name, value: p.id }))}
                  placeholder="Seleccionar cliente..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Almacén de Salida *</label>
                <SearchableSelect
                  value={state.warehouseId}
                  onChange={setState.setWarehouseId}
                  options={masters.warehouses.map((w: any) => ({ label: w.name, value: w.id }))}
                />
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Fecha Albarán *</label>
                <Input type="date" value={state.date} onChange={e => setState.setDate(e.target.value)} className="font-bold h-10" />
              </div>
           </div>
        </Card>

        <Card className="p-6 space-y-6 shadow-xl bg-slate-50/50">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Logística y Series</h4>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">Serie de Albarán *</label>
              <SearchableSelect value={state.seriesId} onChange={setState.setSeriesId} options={masters.series.map((s: any) => ({ label: s.name, value: s.id }))} />
              {state.seriesError && <p className="text-[10px] text-rose-500 font-bold mt-1">{state.seriesError}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">Periodo Contable *</label>
              <SearchableSelect value={state.periodId} onChange={setState.setPeriodId} options={masters.periods.map((p: any) => ({ label: p.name, value: p.id }))} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-lg overflow-hidden border-slate-100" noPadding>
        <Table columns={columns} data={state.lines || []} />
        <div className="p-6 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center border-t border-slate-200 gap-6">
           <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => actions.addLine()} className="text-emerald-600 font-bold flex items-center gap-2 h-10 border-slate-200 bg-white">
                <PlusSquare size={16} /> Añadir Línea Libre
              </Button>
           </div>
           
           <div className="flex flex-col items-end min-w-[240px] space-y-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between w-full text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                 <span>Base Imponible:</span>
                 <span className="text-slate-600">{computations.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between w-full text-[10px] font-black text-blue-500 uppercase tracking-widest px-1">
                 <span>Cuota IVA:</span>
                 <span>{computations.taxTotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between w-full pt-3 mt-1 border-t items-baseline px-1 border-slate-50">
                 <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total Albarán:</span>
                 <span className="text-2xl font-black text-slate-900 tracking-tighter ml-4">{computations.total.toFixed(2)} €</span>
              </div>
           </div>
        </div>
      </Card>

      {batchEditingIdx !== null && (
        <BatchSelectionModal 
          isOpen={true} onClose={() => setBatchEditingIdx(null)}
          targetQuantity={state.lines[batchEditingIdx]?.quantity || 0}
          itemName={masters.items.find((i: any) => i.id === state.lines[batchEditingIdx]?.itemId)?.name || 'Artículo'}
          manageBy={masters.items.find((i: any) => i.id === state.lines[batchEditingIdx]?.itemId)?.manageBy || 'B'}
          initialDetails={state.lines[batchEditingIdx]?.batchDetails || []}
          onConfirm={(details) => actions.updateLine(batchEditingIdx, 'batchDetails', details)}
          itemId={state.lines[batchEditingIdx]?.itemId}
          warehouseId={state.lines[batchEditingIdx]?.warehouseId || state.warehouseId}
          isSale={true}
        />
      )}
    </div>
  );
};

// --- Sub-componente: VISTA DE DETALLE ---
const SDNDetail: React.FC<{
  sdn: any;
  onBack: () => void;
  onCancel: (id: string) => void;
  onCopyToInvoice: () => void;
  masters: any;
  zones: any[];
  setViewingBatch: (l: any) => void;
}> = ({ sdn, onBack, onCancel, onCopyToInvoice, masters, zones, setViewingBatch }) => {
  const columns = [
    { header: 'Artículo', cell: (l: any) => {
      const item = masters.items.find((it: any) => it.id === l.itemId);
      const hasTrace = l.batchDetails?.length > 0;
      return (
        <div>
          <p className="font-bold text-slate-800">{item?.name || 'Artículo'}</p>
          <p className="text-[10px] text-slate-400 font-mono italic">{item?.code}</p>
          {hasTrace && (
            <Button variant="ghost" size="sm" onClick={() => setViewingBatch(l)} className="mt-1 h-6 px-2 text-[10px] items-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 font-black uppercase">
               <Barcode size={12} /> {item?.manageBy === 'S' ? 'Series' : 'Lotes'} ({l.batchDetails.length})
            </Button>
          )}
        </div>
      );
    }},
    { header: 'Ubicación', accessor: (l: any) => zones.find((z:any) => z.id === l.zoneId)?.name || 'Por defecto' },
    { header: 'Cantidad', align: 'center' as const, accessor: (l: any) => Number(l.quantity).toFixed(2) },
    { header: 'Total', align: 'right' as const, accessor: (l: any) => (Number(l.quantity) * Number(l.price)).toFixed(2) + ' €' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-lg transition shadow-sm border"><ArrowLeft size={20} /></button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Albarán {sdn.seriesPrefix}-{sdn.periodCode}-{String(sdn.docNum).padStart(6, '0')}
          </h1>
        </div>
        <div className="flex gap-3">
          {sdn.status === 'O' && (
            <>
              <Button onClick={onCopyToInvoice} className="flex items-center gap-2"><Copy size={18} /> Facturar</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 space-y-6 shadow-xl border-slate-100">
          <div className="flex justify-between items-start border-b pb-3">
             <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente: <span className="text-slate-900 ml-2">{masters.partners.find((p: any) => p.id === sdn.partnerId)?.name}</span></h4>
          </div>
          {sdn.orderId && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
              <ShoppingCart size={18} className="text-blue-500" />
              <p className="text-xs font-bold text-blue-700 italic">Viene del pedido: {sdn.orderPrefix}-{sdn.periodCode}-{String(sdn.orderDocNum).padStart(6, '0')}</p>
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4 shadow-xl border-slate-100">
           <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">CRONOGRAMA</h4>
           <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-400 italic">Fecha:</span> <span className="font-bold">{new Date(sdn.date).toLocaleDateString()}</span></div>
              <div className="flex justify-between text-sm pt-2 border-t"><span className="text-slate-400 italic">Estado:</span> {sdn.status === 'O' ? <Badge variant="warning">Abierto</Badge> : <Badge variant="success">Facturado</Badge>}</div>
           </div>
        </Card>
      </div>

      <Card className="shadow-lg overflow-hidden border-slate-100" noPadding>
        <Table columns={columns} data={sdn.lines || []} />
        <div className="p-6 bg-slate-900 text-white text-right border-t border-slate-800">
           <div className="flex justify-between items-center opacity-60 text-[10px] font-black uppercase">
              <span>Base Imponible</span>
              <span>{Number(sdn.subtotal).toFixed(2)} €</span>
           </div>
           <div className="flex justify-between items-center text-emerald-400 text-[10px] font-black uppercase mt-1">
              <span>IVA / Impuestos</span>
              <span>{Number(sdn.taxTotal).toFixed(2)} €</span>
           </div>
           <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-700/50">
              <span className="text-slate-400 font-black uppercase text-[10px]">Total Albarán</span>
              <p className="text-3xl font-black text-white">{Number(sdn.total).toFixed(2)} €</p>
           </div>
        </div>
      </Card>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export const SalesDeliveryNotes: React.FC = () => {
  const { token, user } = useAuth();
  const toast = useToast();
  
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [viewingBatch, setViewingBatch] = useState<any>(null);

  const doc = useDocument({ 
    token: token || '', 
    tenantId: user?.tenantId || '', 
    docType: 'SDN', 
    apiEndpoint: '/api/sales/delivery-notes' 
  });

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sales/delivery-notes', {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
      });
      const data = await res.json();
      setDeliveries(Array.isArray(data) ? data : []);
    } catch { toast.error('Error al cargar albaranes'); } 
    finally { setLoading(false); }
  };

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/zones', { headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' } });
      const data = await res.json();
      setZones(Array.isArray(data) ? data : []);
    } catch { }
  };

  useEffect(() => {
    if (user?.tenantId) {
      fetchDeliveries();
      fetchZones();
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('copyFrom')) {
        const sourceData = localStorage.getItem('copy_order_source');
        if (sourceData) {
          const order = JSON.parse(sourceData);
          setOrderId(order.id);
          doc.setState.setPartnerId(order.partnerId);
          doc.setState.setWarehouseId(order.warehouseId);
          doc.setState.setLines(order.lines.map((l:any) => ({
            itemId: l.itemId, quantity: Number(l.orderedQty) - Number(l.deliveredQty),
            price: l.price, warehouseId: l.warehouseId || order.warehouseId,
            zoneId: l.zoneId || '', baseLine: l.lineNum, lineNum: l.lineNum
          })));
          setView('create');
          window.history.replaceState({}, '', '/sales/delivery-notes');
        }
      }
    }
  }, [user?.tenantId]);

  const handleSubmit = async (e: any) => {
    try {
      const data = await doc.actions.submitDocument({ orderId });
       toast.success(`Albarán registrado nº ${data.docNum}`);
      setView('list'); fetchDeliveries();
    } catch (err: any) { toast.error(err.message); }
  };

  if (view === 'create') return (
    <>
      <SDNForm onBack={() => setView('list')} onSubmit={handleSubmit} state={doc.state} setState={doc.setState} masters={doc.masters} actions={doc.actions} computations={doc.computations} zones={zones} orderId={orderId} setViewingBatch={setViewingBatch} />
      {viewingBatch && (
        <BatchSelectionModal 
           isOpen={true} onClose={() => setViewingBatch(null)}
           targetQuantity={viewingBatch.quantity}
           itemName={doc.masters.items.find((i: any) => i.id === viewingBatch.itemId)?.name || ''}
           manageBy={doc.masters.items.find((i: any) => i.id === viewingBatch.itemId)?.manageBy || 'B'}
           initialDetails={viewingBatch.batchDetails || []}
           onConfirm={() => {}}
           readOnly
        />
      )}
    </>
  );
  
  if (view === 'detail' && selectedDelivery) return (
    <>
      <SDNDetail sdn={selectedDelivery} onBack={() => setView('list')} onCancel={() => {}} onCopyToInvoice={() => { localStorage.setItem('copy_pdn_source', JSON.stringify(selectedDelivery)); window.location.href = `/sales/invoices?copyFrom=${selectedDelivery.id}`; }} masters={doc.masters} zones={zones} setViewingBatch={setViewingBatch} />
      {viewingBatch && (
        <BatchSelectionModal 
           isOpen={true} onClose={() => setViewingBatch(null)}
           targetQuantity={viewingBatch.quantity}
           itemName={doc.masters.items.find((i: any) => i.id === viewingBatch.itemId)?.name || ''}
           manageBy={doc.masters.items.find((i: any) => i.id === viewingBatch.itemId)?.manageBy || 'B'}
           initialDetails={viewingBatch.batchDetails || []}
           onConfirm={() => {}}
           readOnly
        />
      )}
    </>
  );

  return <SDNList data={deliveries} loading={loading} partners={doc.masters.partners} onCreate={() => setView('create')} onDetail={async (p) => { 
    setLoading(true);
    const res = await fetch(`/api/sales/delivery-notes/${p.id}`, { headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' } });
    const data = await res.json();
    setSelectedDelivery(data); setView('detail'); setLoading(false);
  }} onCopyToInvoice={(p) => { fetch(`/api/sales/delivery-notes/${p.id}`, { headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' } }).then(r => r.json()).then(detail => { localStorage.setItem('copy_pdn_source', JSON.stringify(detail)); window.location.href = `/sales/invoices?copyFrom=${p.id}`; }); }} />;
};
