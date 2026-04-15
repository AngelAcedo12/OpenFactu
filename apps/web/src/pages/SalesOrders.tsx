import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Loader, useToast, Badge, FilterBar, SearchableSelect } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { FileDigit, Plus, Trash2, ArrowLeft, Save, Copy, PlusSquare, Barcode, AlertCircle, Download } from 'lucide-react';
import { PrintTemplateButton } from '../components/PrintTemplateButton';
import { downloadPdf } from '../utils/downloadPdf';
import { useFormat } from '../hooks/useFormat';
import { BatchSelectionModal } from '../components/BatchSelectionModal';
import { useDocument, useDataTable } from '@openfactu/common';

// --- Sub-componente: VISTA DE LISTADO ---
const SOList: React.FC<{
 data: any[];
 loading: boolean;
 partners: any[];
 onCreate: () => void;
 onDetail: (order: any) => void;

 doc: any
}> = ({ data, loading, partners, onCreate, onDetail, doc }) => {
 const { token, user } = useAuth();
 const toast = useToast();
 const fmt = useFormat();
 const [downloadingId, setDownloadingId] = useState<string | null>(null);

 const handleQuickPdf = async (id: string) => {
   setDownloadingId(id);
   try {
     await downloadPdf(`/api/sales/${id}/pdf`, token || '', user?.tenantId || '');
   } catch (e: any) {
     toast.error(e.message || 'Error al descargar PDF');
   } finally {
     setDownloadingId(null);
   }
 };

 const { filteredData, searchTerm, setSearchTerm, activeFilters, setFilter, clearFilters } = useDataTable({  data,
 searchColumns: ['docCode', 'partnerName', 'total'] as any,
 filters: [
 { key: 'partnerId', type: 'select', label: 'Cliente', options: partners.map(p => ({ label: p.name, value: p.id })) },
 { key: 'status', type: 'select', label: 'Estado', options: [
 { label: 'Abierto', value: 'O' }, { label: 'Parcial', value: 'P' }, { label: 'Cerrado', value: 'C' }
 ]},
 { key: 'date', type: 'date', label: 'Fecha' }
 ]
 });

 const columns = [
 { header: 'No. Pedido', accessor: (item: any) => (
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 dark:text-slate-100 leading-none">{item.seriesPrefix}-{item.periodCode}-{String(item.docNum).padStart(6, '0')}</span>
 <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">ID: {item.id.substring(0,8)}</span>
 </div>
 )},
 { header: 'Fecha', accessor: (item: any) => fmt.date(item.date) },
 { header: 'Cliente', accessor: (item: any) => item.partnerName || partners.find(p => p.id === item.partnerId)?.name || '...' },
 { header: 'Total', align: 'right' as const, accessor: (item: any) => <span className="font-black text-slate-900 dark:text-slate-100">{fmt.money(item.total)}</span> },
 { header: 'Estado', align: 'center' as const, cell: (item: any) => (
 <>
 {item.status === 'O' && <Badge variant="warning">Abierto</Badge>}
 {item.status === 'P' && <Badge variant="info">Parcial</Badge>}
 {item.status === 'C' && <Badge variant="success">Cerrado</Badge>}
 </>
 )},
 { header: 'Acciones', align: 'right' as const, cell: (item: any) => (
 <div className="flex items-center justify-end gap-2">
   <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleQuickPdf(item.id); }} isLoading={downloadingId === item.id} className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-primary" title="Descargar PDF">
     <Download size={14} />
   </Button>
   <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onDetail(item); }}>Ver Pedido</Button>
 </div>
 )}
 ];

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
 <div>
 <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-4 tracking-tighter">
 <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-300 shadow-sm border border-blue-100 dark:border-blue-500/20">
 <FileDigit size={32} />
 </div>
 Pedidos de Venta
 </h1>
 <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 font-medium ml-1">Gestión de preventas y órdenes de clientes.</p>
 {doc.state.mastersError && (
 <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-200 text-xs font-bold animate-in slide-in-from-top">
 <AlertCircle size={16} />
 {doc.state.mastersError}
 </div>
 )}
 </div>
 <div className="flex items-center gap-3">
 <Button  onClick={onCreate}  disabled={!doc.state.canWrite}
 className="flex items-center gap-2 h-12 px-6 disabled:opacity-50" >
 <Plus size={20} /> Nuevo Pedido
 </Button>
 </div>
 </div>

 <Card className="overflow-hidden"noPadding>
 <FilterBar  searchTerm={searchTerm} onSearchChange={setSearchTerm}
 activeFilters={activeFilters} onFilterChange={setFilter} onClear={clearFilters}
 config={[
 { key: 'partnerId', label: 'Cliente', type: 'select', options: partners.map(p => ({ label: p.name, value: p.id })) },
 { key: 'status', label: 'Estado', type: 'select', options: [
 { label: 'Abierto', value: 'O' }, { label: 'Parcial', value: 'P' }, { label: 'Cerrado', value: 'C' }
 ]},
 { key: 'date', label: 'Fecha', type: 'date' }
 ]}
 searchPlaceholder="Buscar pedido..." />
 <Table columns={columns} data={filteredData} isLoading={loading} onRowClick={onDetail} />
 </Card>
 </div>
 );
};

// --- Sub-componente: VISTA DE FORMULARIO ---
const SOForm: React.FC<{
 onBack: () => void;
 onSubmit: (e: any) => void;
 state: any;
 setState: any;
 masters: any;
 actions: any;
 computations: any;
 extraState: {
 deliveryDate: string; setDeliveryDate: any;
 billToAddress: string; setBillToAddress: any;
 shipToAddress: string; setShipToAddress: any;
 };
 setViewingBatch: (l: any) => void;
}> = ({ onBack, onSubmit, state, setState, masters, actions, computations, extraState, setViewingBatch }) => {
 const [batchEditingIdx, setBatchEditingIdx] = useState<number | null>(null);
  const handlePartnerChange = (id: string) => {
 setState.setPartnerId(id);
 const p = masters.partners.find((x:any) => x.id === id);
 if (p && p.addresses) {
 const defBill = p.addresses.find((a:any) => a.type === 'B' && a.isDefault) || p.addresses.find((a:any) => a.type === 'B') || null;
 const defShip = p.addresses.find((a:any) => a.type === 'S' && a.isDefault) || p.addresses.find((a:any) => a.type === 'S') || null;
 const formatAddr = (a: any) => a ? `${a.street || ''}\n${a.zipCode || ''} ${a.city || ''}\n${a.state ? a.state + '\n' : ''}${a.country || ''}`.trim() : '';
 extraState.setBillToAddress(formatAddr(defBill));
 extraState.setShipToAddress(formatAddr(defShip));
 }
 };

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
 placeholder="Seleccionar artículo..." />
 {item?.manageBy !== 'N' && l.itemId && (
 <div className="flex items-center gap-2">
 <Button variant="ghost"size="sm"onClick={() => setBatchEditingIdx(idx)} className="text-[10px] text-indigo-600 dark:text-indigo-300 font-black uppercase p-0 h-auto hover:bg-transparent hover:text-indigo-800 flex items-center gap-1">
 {hasTrace ? <Barcode size={12} className="text-emerald-500"/> : <Plus size={12} />}
 {hasTrace ? `${item?.manageBy === 'S' ? 'Series' : 'Lotes'} (${l.batchDetails.length})` : 'Asignar Trazabilidad'}
 </Button>
 </div>
 )}
 </div>
 );
 }, width: '40%' },
 { header: 'Cant.', align: 'center' as const, cell: (l: any, idx: number) => (
 <Input type="number"value={l.quantity} onChange={e => actions.updateLine(idx, 'quantity', e.target.value)} className="w-20 text-center font-bold"/>
 )},
 { header: 'Precio', align: 'right' as const, cell: (l: any, idx: number) => (
 <Input type="text"value={l.price} onChange={e => actions.updateLine(idx, 'price', e.target.value)} className="w-24 text-right"/>
 )},
 { header: '% IVA', align: 'center' as const, cell: (l: any, idx: number) => (
 <select value={l.taxGroupId || ''} onChange={e => actions.updateLine(idx, 'taxGroupId', e.target.value)} className="w-20 h-9 border rounded-lg text-xs bg-white dark:bg-slate-900">
 <option value="">0%</option>
 {masters.taxGroups.map((t: any) => <option key={t.id} value={t.id}>{t.rate}%</option>)}
 </select>
 )},
 { header: 'Total', align: 'right' as const, cell: (l: any) => (
 <span className="font-black text-slate-800 dark:text-slate-100">
 {(Number(l.quantity || 0) * Number(l.price || 0) * (1 + (masters.taxGroups.find((t:any) => t.id === l.taxGroupId)?.rate || 0)/100)).toFixed(2)} €
 </span>
 )},
 { header: '', align: 'center' as const, cell: (_: any, idx: number) => (
 <Button variant="ghost"size="sm"onClick={() => actions.removeLine(idx)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500">
 <Trash2 size={16} />
 </Button>
 )}
 ];

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <button onClick={onBack} className="p-2 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition shadow-sm border"><ArrowLeft size={20} /></button>
 <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Nuevo Pedido de Venta</h1>
 </div>
 <Button  onClick={onSubmit}  isLoading={state.isSubmitting}  disabled={!!state.seriesError || !state.canWrite}  className="shadow-lg px-8 flex items-center gap-2 disabled:opacity-50" >
 <Save size={18} /> Confirmar Pedido
 </Button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="p-6 md:col-span-2 space-y-6 border-t-4 border-t-blue-500">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cliente *</label>
 <SearchableSelect  value={state.partnerId}  onChange={handlePartnerChange}  options={masters.partners.map((p: any) => ({ label: p.name, value: p.id }))}  placeholder="Seleccionar..." />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Almacén de Salida *</label>
 <SearchableSelect value={state.warehouseId} onChange={setState.setWarehouseId} options={masters.warehouses.map((w: any) => ({ label: w.name, value: w.id }))} />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dirección Facturación</label>
 <textarea value={extraState.billToAddress} onChange={e => extraState.setBillToAddress(e.target.value)} className="w-full h-20 border rounded-lg p-2 text-xs bg-slate-50 dark:bg-slate-800/50"/>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dirección de Envío</label>
 <textarea value={extraState.shipToAddress} onChange={e => extraState.setShipToAddress(e.target.value)} className="w-full h-20 border rounded-lg p-2 text-xs bg-slate-50 dark:bg-slate-800/50"/>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-6 pt-2">
 <div className="space-y-1">
 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Fec. Contabilización</label>
 <Input type="date"value={state.date} onChange={e => setState.setDate(e.target.value)} className="h-10"/>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Fec. Entrega Prevista</label>
 <Input type="date"value={extraState.deliveryDate} onChange={e => extraState.setDeliveryDate(e.target.value)} className="h-10 border-blue-100 dark:border-blue-500/20 bg-blue-50/20"/>
 </div>
 </div>
 </Card>

 <Card className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-800/50">
 <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest border-b pb-2">Control de Series</h4>
 <div className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">Serie de Pedido *</label>
 <SearchableSelect value={state.seriesId} onChange={setState.setSeriesId} options={masters.series.map((s: any) => ({ label: s.name, value: s.id }))} />
 {state.seriesError && <p className="text-[10px] text-rose-500 font-bold mt-1">{state.seriesError}</p>}
 </div>
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">Periodo Contable *</label>
 <SearchableSelect value={state.periodId} onChange={setState.setPeriodId} options={masters.periods.map((p: any) => ({ label: p.name, value: p.id }))} />
 </div>
 </div>
 </Card>
 </div>

 <Card className="shadow-lg overflow-hidden border-slate-100 dark:border-slate-800"noPadding>
 <Table columns={columns} data={state.lines} />
 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center border-t border-slate-200 dark:border-slate-700">
 <Button variant="ghost"size="sm"onClick={() => actions.addLine()} className="text-blue-600 dark:text-blue-300 font-bold flex items-center gap-2">
 <PlusSquare size={16} /> Añadir Línea de Pedido
 </Button>
 <div className="space-y-1 text-right min-w-[200px]">
 <div className="flex justify-between px-2">
 <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Subtotal:</span>
 <span className="font-bold text-slate-800 dark:text-slate-100">{computations.subtotal.toFixed(2)} €</span>
 </div>
 <div className="flex justify-between px-2 text-amber-600 dark:text-amber-300">
 <span className="text-[10px] font-black uppercase">Impuestos:</span>
 <span className="font-bold">{computations.taxTotal.toFixed(2)} €</span>
 </div>
 <div className="flex justify-between px-2 pt-2 mt-1 border-t text-xl font-black text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700">
 <span className="text-[10px] uppercase">Total Pedido:</span>
 <span>{computations.total.toFixed(2)} €</span>
 </div>
 </div>
 </div>
 </Card>

 {batchEditingIdx !== null && (
 <BatchSelectionModal  isOpen={true} onClose={() => setBatchEditingIdx(null)}
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
const SODetail: React.FC<{
 onBack: () => void;
 onCopyToDelivery: () => void;
 masters: any;
 setViewingBatch: (l: any) => void;
 order: any,
 doc: any
}> = ({ order, onBack, onCopyToDelivery, masters, setViewingBatch }) => {
 const columns = [
 { header: 'Artículo', cell: (l: any) => {
 const item = masters.items.find((it: any) => it.id === l.itemId);
 const hasTrace = l.batchDetails?.length > 0;
 return (
 <div>
 <p className="font-bold text-slate-800 dark:text-slate-100">{item?.name || 'Artículo'}</p>
 <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono italic">{item?.code}</p>
 {hasTrace && (
 <Button variant="ghost"size="sm"onClick={() => setViewingBatch(l)} className="mt-1 h-6 px-2 text-[10px] items-center gap-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-100 dark:border-indigo-500/20 font-black uppercase">
 <Barcode size={12} /> {item?.manageBy === 'S' ? 'Series' : 'Lotes'} ({l.batchDetails.length})
 </Button>
 )}
 </div>
 );
 }},
 { header: 'Pedido', align: 'center' as const, accessor: (l: any) => Number(l.orderedQty).toFixed(2) },
 { header: 'Entregado', align: 'center' as const, cell: (l: any) => (
 <span className={Number(l.deliveredQty) > 0 ?"text-emerald-600 dark:text-emerald-300 font-bold":"text-slate-400 dark:text-slate-500"}>
 {Number(l.deliveredQty).toFixed(2)}
 </span>
 )},
 { header: 'Precio', align: 'right' as const, accessor: (l: any) => Number(l.price).toFixed(2) + ' €' },
 { header: 'Línea Total', align: 'right' as const, accessor: (l: any) => Number(l.lineTotal).toFixed(2) + ' €' }
 ];

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in slide-in-from-right duration-300">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <button onClick={onBack} className="p-2 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition shadow-sm border"><ArrowLeft size={20} /></button>
 <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
 Pedido {order.seriesPrefix}-{order.periodCode}-{String(order.docNum).padStart(6, '0')}
 </h1>
 {order.status === 'O' && <Badge variant="warning">Abierto</Badge>}
 {order.status === 'P' && <Badge variant="info">Entregado Parcial</Badge>}
 {order.status === 'C' && <Badge variant="success">Cerrado / Entregado</Badge>}
 </div>
 <div className="flex items-center gap-2">
 <PrintTemplateButton docType="SO"pdfUrl={`/api/sales/${order.id}/pdf`} label="PDF"/>
 {order.status !== 'C' && (
 <Button onClick={onCopyToDelivery} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
 <Copy size={18} /> Generar Salida (Albarán)
 </Button>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="p-6 md:col-span-2 space-y-6 border-slate-100 dark:border-slate-800">
 <div className="flex justify-between items-start border-b pb-3">
 <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Cliente: <span className="text-slate-900 dark:text-slate-100 ml-2 font-bold">{masters.partners.find((p: any) => p.id === order.partnerId)?.name}</span></h4>
 </div>
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-1">
 <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase">Facturar a</span>
 <pre className="text-[11px] font-sans text-slate-600 dark:text-slate-300 dark:text-slate-600 whitespace-pre-wrap leading-tight">{order.billToAddress}</pre>
 </div>
 <div className="space-y-1">
 <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase">Enviar a</span>
 <pre className="text-[11px] font-sans text-slate-600 dark:text-slate-300 dark:text-slate-600 whitespace-pre-wrap leading-tight italic">{order.shipToAddress}</pre>
 </div>
 </div>
 </Card>

 <Card className="p-6 space-y-4 border-slate-100 dark:border-slate-800">
 <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest border-b pb-2">HITOS DEL PEDIDO</h4>
 <div className="space-y-2">
 <div className="flex justify-between text-sm"><span className="text-slate-400 dark:text-slate-500 italic">Contabilizado:</span> <span className="font-bold">{new Date(order.date).toLocaleDateString()}</span></div>
 <div className="flex justify-between text-sm"><span className="text-slate-400 dark:text-slate-500 italic">Entrega prevista:</span> <span className="font-bold text-blue-600 dark:text-blue-300">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Por confirmar'}</span></div>
 </div>
 </Card>
 </div>

 <Card className="shadow-lg overflow-hidden border-slate-100 dark:border-slate-800"noPadding>
 <Table columns={columns} data={order.lines} />
 <div className="p-6 bg-slate-900 text-white text-right border-t border-slate-800">
 <div className="flex justify-between items-baseline opacity-60 text-[10px] font-black uppercase">
 <span>Base Imponible</span>
 <span>{Number(order.subtotal).toFixed(2)} €</span>
 </div>
 <div className="flex justify-between items-baseline text-blue-400 text-[10px] font-black uppercase mt-1">
 <span>Cuota IVA</span>
 <span>{(Number(order.total) - Number(order.subtotal)).toFixed(2)} €</span>
 </div>
 <div className="flex justify-between items-baseline pt-3 mt-2 border-t border-slate-700/50">
 <span className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]">Total Pedido</span>
 <p className="text-3xl font-black text-white">{Number(order.total).toFixed(2)} €</p>
 </div>
 </div>
 </Card>
 </div>
 );
};

// --- COMPONENTE PRINCIPAL ---
export const SalesOrders: React.FC = () => {
 const { token, user } = useAuth();
 const toast = useToast();
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
 const [orders, setOrders] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedOrder, setSelectedOrder] = useState<any>(null);
 const [viewingBatch, setViewingBatch] = useState<any>(null);

 // Estados extras del formulario
 const [deliveryDate, setDeliveryDate] = useState('');
 const [billToAddress, setBillToAddress] = useState('');
 const [shipToAddress, setShipToAddress] = useState('');

 const doc = useDocument({  token: token || '',  tenantId: user?.tenantId || '',  docType: 'SO',  apiEndpoint: '/api/sales',
 permissions: (user as any)?.permissions?.['/sales-orders']
 });

 const fetchOrders = async () => {
 try {
 setLoading(true);
 const res = await fetch('/api/sales', {
 headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
 });
 const data = await res.json();
 setOrders(Array.isArray(data) ? data : []);
 } catch { toast.error('Error al cargar pedidos'); }  finally { setLoading(false); }
 };

 useEffect(() => {  if (token && user?.tenantId) {
 fetchOrders();  } else if (token) {
 setLoading(false);
 }
 }, [token, user]);

 const handleSubmit = async (e: any) => {
 try {
 const data = await doc.actions.submitDocument({ deliveryDate, billToAddress, shipToAddress });
 toast.success(`Pedido registrado nº ${data.header.docNum}`);
 setView('list'); fetchOrders();
 } catch (err: any) { toast.error(err.message); }
 };

 if (view === 'create') return (
 <>
 <SOForm onBack={() => setView('list')} onSubmit={handleSubmit} state={doc.state} setState={doc.setState} masters={doc.masters} actions={doc.actions} computations={doc.computations} extraState={{ deliveryDate, setDeliveryDate, billToAddress, setBillToAddress, shipToAddress, setShipToAddress }} setViewingBatch={setViewingBatch} />
 {viewingBatch && (
 <BatchSelectionModal  isOpen={true} onClose={() => setViewingBatch(null)}
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
  if (view === 'detail' && selectedOrder) return (
 <>
 <SODetail doc={doc} order={selectedOrder} onBack={() => setView('list')} onCopyToDelivery={() => { localStorage.setItem('copy_order_source', JSON.stringify(selectedOrder)); window.location.href = `/sales/delivery-notes?copyFrom=${selectedOrder.id}`; }} masters={doc.masters} setViewingBatch={setViewingBatch} />
 {viewingBatch && (
 <BatchSelectionModal  isOpen={true} onClose={() => setViewingBatch(null)}
 targetQuantity={viewingBatch.quantity || viewingBatch.orderedQty}
 itemName={doc.masters.items.find((i: any) => i.id === viewingBatch.itemId)?.name || ''}
 manageBy={doc.masters.items.find((i: any) => i.id === viewingBatch.itemId)?.manageBy || 'B'}
 initialDetails={viewingBatch.batchDetails || []}
 onConfirm={() => {}}
 readOnly
 />
 )}
 </>
 );

 return <SOList doc={doc} data={orders} loading={loading} partners={doc.masters.partners} onCreate={() => setView('create')} onDetail={async (p) => {  setLoading(true);
 const res = await fetch(`/api/sales/${p.id}`, { headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' } });
 const data = await res.json();
 setSelectedOrder(data); setView('detail'); setLoading(false);
 }} />;
};
