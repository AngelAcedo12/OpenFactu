import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Loader, useToast, Badge, FilterBar, SearchableSelect, cn } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { FileStack, Plus, Trash2, ArrowLeft, Save, FileText, Copy, PlusSquare, Barcode, AlertCircle, Download } from 'lucide-react';
import { PrintTemplateButton } from '../components/PrintTemplateButton';
import { downloadPdf } from '../utils/downloadPdf';
import { useFormat } from '../hooks/useFormat';
import { BatchSelectionModal } from '../components/BatchSelectionModal';
import { PluginFields } from '../components/PluginFields';
import { useDocument, useDataTable } from '@openfactu/common';

// --- Sub-componente: VISTA DE LISTADO ---
const InvoiceList: React.FC<{  data: any[],  loading: boolean,  partners: any[],  onCreate: () => void,
 onDetail: (inv: any) => void,
 canWrite?: boolean,
 doc: any
}> = ({ data, loading, partners, onCreate, onDetail, canWrite, doc }) => {
 const { token, user } = useAuth();
 const toast = useToast();
 const fmt = useFormat();
 const [downloadingId, setDownloadingId] = useState<string | null>(null);
 const handleQuickPdf = async (id: string) => {
   setDownloadingId(id);
   try {
     await downloadPdf(`/api/sales/invoices/${id}/pdf`, token || '', user?.tenantId || '');
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
 { label: 'Asentado', value: 'O' },
 { label: 'Cancelado', value: 'X' }
 ]},
 { key: 'date', type: 'date', label: 'Fecha' }
 ]
 });

 const columns = [
 { header: 'Documento', accessor: (item: any) => (
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 dark:text-slate-100 leading-none">{item.seriesPrefix}-{item.periodCode}-{String(item.docNum).padStart(6, '0')}</span>
 <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 uppercase tracking-tighter">ID: {item.id.substring(0,8)}</span>
 </div>
 )},
 { header: 'Fecha', accessor: (item: any) => fmt.date(item.date) },
 { header: 'Cliente', accessor: (item: any) => (
 <div>
 <p className="font-bold text-slate-700 dark:text-slate-200 leading-tight">{item.partnerName}</p>
 <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">CIE: {item.partnerId.substring(0,6)}</p>
 </div>
 )},
 { header: 'Desde Albarán', cell: (item: any) => (
 item.baseDocCode ? (
 <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/30 text-[10px] font-black text-indigo-700 dark:text-indigo-200 uppercase tracking-tight">
 <FileText size={11} /> {item.baseDocCode}
 </span>
 ) : <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold italic">Directa</span>
 )},
 { header: 'Total', align: 'right' as const, accessor: (item: any) => (
 <span className="font-black text-slate-900 dark:text-slate-100">
 {fmt.money(item.total)}
 </span>
 )},
 { header: 'Estado', align: 'center' as const, cell: (item: any) => (
 item.status === 'O' ? <Badge variant="success">Asentado</Badge> : <Badge variant="error">Cancelado</Badge>
 )},
 { header: 'Acciones', align: 'right' as const, cell: (item: any) => (
 <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleQuickPdf(item.id); }} isLoading={downloadingId === item.id} className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-primary" title="Descargar PDF">
   <Download size={14} />
 </Button>
 )}
 ];

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
 <div>
 <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-4 tracking-tighter">
 <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl text-amber-600 dark:text-amber-300 shadow-sm border border-amber-100 dark:border-amber-500/20">
 <FileStack size={32} />
 </div>
 Facturas de Venta
 </h1>
 <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 font-medium ml-1">Emisión de facturas a clientes y contabilidad de ingresos.</p>
 {doc.state.mastersError && (
 <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-200 text-xs font-bold animate-in slide-in-from-top">
 <AlertCircle size={16} />
 {doc.state.mastersError}
 </div>
 )}
 </div>
 <div className="flex items-center gap-3">
 <Button  onClick={onCreate}  disabled={!canWrite}
 className="flex items-center gap-2 h-12 px-6 disabled:opacity-50" >
 <Plus size={20} /> Nueva Factura Directa
 </Button>
 </div>
 </div>

 <Card className="overflow-hidden"noPadding>
 <FilterBar  searchTerm={searchTerm} onSearchChange={setSearchTerm}
 activeFilters={activeFilters} onFilterChange={setFilter} onClear={clearFilters}
 config={[
 { key: 'partnerId', label: 'Cliente', type: 'select', options: partners.map(p => ({ label: p.name, value: p.id })) },
 { key: 'status', label: 'Estado', type: 'select', options: [
 { label: 'Asentado', value: 'O' }, { label: 'Cancelado', value: 'X' }
 ]},
 { key: 'date', label: 'Fecha', type: 'date' }
 ]}
 searchPlaceholder="Buscar por factura..." />
 <Table columns={columns} data={filteredData || []} isLoading={loading} onRowClick={onDetail} />
 </Card>
 </div>
 );
};

// --- Sub-componente: VISTA DE CREACIÓN / EDICIÓN ---
const InvoiceForm: React.FC<{
 onBack: () => void;
 onSubmit: (extra?: any) => Promise<void>;
 state: any;
 setState: any;
 masters: any;
 actions: any;
 computations: any;
 setViewingBatch: (l: any) => void;
}> = ({ onBack, onSubmit, state, setState, masters, actions, computations, setViewingBatch }) => {
 const [batchEditingIdx, setBatchEditingIdx] = useState<number | null>(null);

 const columns = [
 { header: 'Artículo', cell: (l: any, idx: number) => {
 const item = masters.items.find((i: any) => i.id === l.itemId);
 const hasTrace = l.batchDetails?.length > 0;
 return (
 <div className="space-y-2">
 <SearchableSelect
 value={l.itemId}
 disabled={!!l.baseId}
 onChange={(val) => actions.updateLine(idx, 'itemId', val)}
 options={masters.items.map((i: any) => ({ label: `[${i.code}] ${i.name}`, value: i.id }))}
 placeholder="Seleccionar artículo..." className={l.baseId ?"opacity-60 grayscale-[0.5]":""}
 />
 {item?.manageBy !== 'N' && l.itemId && (
 <div className="flex items-center gap-2">
 <Button variant="ghost"size="sm"onClick={() => hasTrace ? setViewingBatch(l) : setBatchEditingIdx(idx)} className="text-[10px] text-indigo-600 dark:text-indigo-300 font-black uppercase p-0 h-auto hover:bg-transparent hover:text-indigo-800 flex items-center gap-1">
 {hasTrace ? <Barcode size={12} className="text-emerald-500"/> : <Plus size={12} />}
 {hasTrace ? `${item?.manageBy === 'S' ? 'Series' : 'Lotes'} (${l.batchDetails.length})` : 'Asignar Trazabilidad'}
 </Button>
 </div>
 )}
 {l.baseId && hasTrace && (
 <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase italic leading-none">Trazabilidad Vinculada al Albarán</p>
 )}
 </div>
 );
 }, width: '40%' },
 { header: 'Cantidad', align: 'center' as const, cell: (l: any, idx: number) => (
 <Input
 type="number" value={l.quantity}
 disabled={!!l.baseId}
 onChange={(e) => actions.updateLine(idx, 'quantity', e.target.value)}
 className={cn("w-24 text-center font-bold h-9", l.baseId &&"bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 cursor-not-allowed")}
 />
 ), width: '10%' },
 { header: 'Precio', align: 'right' as const, cell: (l: any, idx: number) => (
 <Input
 type="text" value={l.price}
 disabled={!!l.baseId}  onChange={(e) => actions.updateLine(idx, 'price', e.target.value)}
 className={cn("w-24 text-right font-medium h-9", l.baseId &&"bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 cursor-not-allowed")}
 />
 ), width: '12%' },
 { header: '% IVA', align: 'center' as const, cell: (l: any, idx: number) => (
 <select  value={l.taxGroupId || ''}  disabled={!!l.baseId}
 onChange={e => actions.updateLine(idx, 'taxGroupId', e.target.value)}  className={cn("h-9 w-20 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center", l.baseId ?"bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-100 dark:border-slate-800":"bg-slate-50 dark:bg-slate-800/50")}
 >
 <option value="">0%</option>
 {masters.taxGroups.map((t: any) => <option key={t.id} value={t.id}>{t.rate}%</option>)}
 </select>
 ), width: '10%' },
 { header: 'Total', align: 'right' as const, cell: (l: any) => (
 <span className={cn("font-black", l.baseId ?"text-slate-400 dark:text-slate-500":"text-slate-900 dark:text-slate-100")}>
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
 {!state.lines[idx].baseId && (
 <Button variant="ghost"size="sm"onClick={() => actions.removeLine(idx)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500">
 <Trash2 size={16} />
 </Button>
 )}
 </div>
 ), width: '8%' }
 ];

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
 <div className="flex items-center gap-4">
 <button onClick={onBack} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-600 transition-all shadow-sm">
 <ArrowLeft size={20} />
 </button>
 <div>
 <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter flex items-center gap-3">
 {state.lines.some((l:any) => l.baseId) ? 'Facturación de Albarán' : 'Nueva Factura Directa'}
 </h1>
 <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 font-medium ml-1 flex items-center gap-2">
 <FileText size={14} className="text-amber-500"/>
 Ingreso de venta y contabilización de impuestos.
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <Button  onClick={() => onSubmit()}  isLoading={state.isSubmitting}  disabled={!!state.seriesError || !state.canWrite}  className="flex items-center gap-2 h-12 px-8 focus:ring-4 ring-blue-500/10 transition-all disabled:opacity-50" >
 <Save size={20} /> Asentar Factura
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="p-6 md:col-span-2 space-y-6 border-slate-100 dark:border-slate-800">
 <div className="border-b pb-3 flex justify-between items-center">
 <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">Cabecera de Factura</h3>
 <span className="text-[9px] font-bold text-rose-500 uppercase">* Campos obligatorios</span>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cliente *</label>
 <SearchableSelect
 value={state.partnerId}
 onChange={setState.setPartnerId}
 options={masters.partners.map((p: any) => ({ label: p.name, value: p.id }))}
 placeholder="Seleccionar cliente..." />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fecha Factura *</label>
 <Input type="date"value={state.date} onChange={(e) => setState.setDate(e.target.value)} className="font-bold text-slate-700 dark:text-slate-200 h-10 border-slate-200 dark:border-slate-700"/>
 </div>
 </div>
 <PluginFields  tableName="SalesInvoice" values={state.pluginData}  onChange={setState.setPluginField}  disabled={state.isSubmitting}  />
 </Card>

 <Card className="p-6 space-y-6 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
 <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest border-b pb-2">Series y Periodo</h4>
 <div className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">Serie de Numeración *</label>
 <SearchableSelect
 value={state.seriesId}
 onChange={setState.setSeriesId}
 options={masters.series.map((s: any) => ({ label: s.name, value: s.id }))}
 />
 {state.seriesError && <p className="text-[10px] text-rose-500 font-bold mt-1 italic">{state.seriesError}</p>}
 </div>
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">Periodo Contable *</label>
 <SearchableSelect
 value={state.periodId}
 onChange={setState.setPeriodId}
 options={masters.periods.map((p: any) => ({ label: p.name, value: p.id }))}
 />
 </div>
 </div>
 </Card>
 </div>

 <Card className="shadow-lg overflow-hidden border-slate-100 dark:border-slate-800"noPadding>
 <Table columns={columns} data={state.lines || []} emptyMessage="No hay líneas en la factura."/>
 <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center border-t border-slate-100 dark:border-slate-800 gap-6">
 <div className="flex flex-wrap items-center gap-3">
 <Button variant="secondary"size="sm"onClick={() => actions.addLine()} className="text-amber-600 dark:text-amber-300 font-bold flex items-center gap-2 h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
 <PlusSquare size={16} /> Añadir Línea Libre
 </Button>
 </div>
  <div className="flex flex-col items-end min-w-[240px] space-y-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
 <div className="flex justify-between w-full text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
 <span>Base Imponible:</span>
 <span className="text-slate-600 dark:text-slate-300 dark:text-slate-600">{computations.subtotal.toFixed(2)} €</span>
 </div>
 <div className="flex justify-between w-full text-[10px] font-black text-amber-500 uppercase tracking-widest px-1">
 <span>Cuota IVA:</span>
 <span>{computations.taxTotal.toFixed(2)} €</span>
 </div>
 <div className="flex justify-between w-full pt-3 mt-1 border-t items-baseline px-1 border-slate-50">
 <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">Total Factura:</span>
 <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter ml-4">{computations.total.toFixed(2)} €</span>
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
const InvoiceDetail: React.FC<{
 invoice: any;
 onBack: () => void;
 masters: any;
 setViewingBatch: (l: any) => void;
}> = ({ invoice, onBack, masters, setViewingBatch }) => {
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
 { header: 'Cantidad', align: 'center' as const, accessor: (l: any) => Number(l.quantity).toFixed(2) },
 { header: 'Precio', align: 'right' as const, accessor: (l: any) => Number(l.price).toFixed(2) + ' €' },
 { header: 'Total', align: 'right' as const, accessor: (l: any) => (Number(l.quantity) * Number(l.price)).toFixed(2) + ' €' }
 ];

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in slide-in-from-right duration-300">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <button onClick={onBack} className="p-2 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition shadow-sm border"><ArrowLeft size={20} /></button>
 <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
 Factura {invoice.seriesPrefix}-{invoice.periodCode}-{String(invoice.docNum).padStart(6, '0')}
 </h1>
 </div>
 <PrintTemplateButton docType="SINV"pdfUrl={`/api/sales/invoices/${invoice.id}/pdf`} />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="p-6 md:col-span-2 space-y-6 border-slate-100 dark:border-slate-800">
 <div className="flex justify-between items-start border-b pb-3">
 <div>
 <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">CLIENTE</h4>
 <p className="text-xl font-black text-slate-900 dark:text-slate-100">{masters.partners.find((p: any) => p.id === invoice.partnerId)?.name}</p>
 </div>
 </div>
 <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/30 rounded-xl">
 <FileText size={18} className="text-amber-600 dark:text-amber-300"/>
 <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">Este documento es una factura contable firme y genera obligaciones de cobro.</p>
 </div>
 </Card>

 <div className="space-y-6">
 <Card className="p-6 space-y-4 border-slate-100 dark:border-slate-800">
 <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest border-b pb-2">CRONOGRAMA</h4>
 <div className="space-y-3">
 <div className="flex justify-between text-sm">
 <span className="text-slate-400 dark:text-slate-500 italic">Fecha Emitida:</span>
 <span className="font-bold text-slate-800 dark:text-slate-100">{new Date(invoice.date).toLocaleDateString()}</span>
 </div>
 </div>
 </Card>
 <Card className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
 <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Estado</span>
 <div className="mt-1">
 {invoice.status === 'O' ? <Badge variant="success">Asentado</Badge> : <Badge variant="error">Cancelado</Badge>}
 </div>
 </Card>
 </div>
 </div>

 <Card className="shadow-lg overflow-hidden border-slate-100 dark:border-slate-800"noPadding>
 <Table columns={columns} data={invoice.lines || []} />
 <div className="p-6 bg-slate-900 text-white text-right border-t border-slate-800">
 <div className="flex justify-between items-center opacity-60 text-[10px] font-black uppercase">
 <span>Base Imponible</span>
 <span>{Number(invoice.subtotal).toFixed(2)} €</span>
 </div>
 <div className="flex justify-between items-center text-amber-400 text-[10px] font-black uppercase mt-1">
 <span>IVA</span>
 <span>{Number(invoice.taxTotal).toFixed(2)} €</span>
 </div>
 <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-700/50">
 <span className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]">Total Factura</span>
 <p className="text-3xl font-black text-white">{Number(invoice.total).toFixed(2)} €</p>
 </div>
 </div>
 </Card>
 </div>
 );
};

// --- COMPONENTE PRINCIPAL ---
export const SalesInvoices: React.FC = () => {
 const { token, user } = useAuth();
 const toast = useToast();
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
 const [invoices, setInvoices] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
 const [viewingBatch, setViewingBatch] = useState<any>(null);

 const doc = useDocument({  token: token || '',  tenantId: user?.tenantId || '',  docType: 'SINV',  apiEndpoint: '/api/sales/invoices',
 permissions: (user as any)?.permissions?.['/sales/invoices']
 });

 const fetchInvoices = async () => {
 try {
 setLoading(true);
 const res = await fetch('/api/sales/invoices', {
 headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
 });
 const data = await res.json();
 setInvoices(Array.isArray(data) ? data : []);
 } catch (e) {
 toast.error('Error al cargar facturas');
 } finally { setLoading(false); }
 };

 useEffect(() => {
 if (token && user?.tenantId) {
 fetchInvoices();
  const urlParams = new URLSearchParams(window.location.search);
 if (urlParams.get('copyFrom')) {
 const sourceData = localStorage.getItem('copy_pdn_source');
 if (sourceData) {
 try {
 const sdn = JSON.parse(sourceData);
 doc.setState.setPartnerId(sdn.partnerId);
 doc.setState.setLines(sdn.lines.map((l: any) => ({
 itemId: l.itemId,
 quantity: l.quantity,
 price: l.price,
 taxGroupId: l.taxGroupId,
 warehouseId: l.warehouseId,
 zoneId: l.zoneId,
 batchDetails: l.batchDetails,
 baseType: 'SDN',
 baseId: sdn.id,
 baseLine: l.lineNum || l.id
 })));
 setView('create');
 window.history.replaceState({}, '', '/sales/invoices');
 } catch (e) {
 console.error('Error parsing copy_pdn_source', e);
 }
 }
 }
 } else if (token) {
 setLoading(false);
 }
 }, [token, user?.tenantId]);

 const handleSubmit = async (extra?: any) => {
 try {
 await doc.actions.submitDocument(extra);
 toast.success('Factura emitida correctamente');
 setView('list');
 fetchInvoices();
 } catch (e: any) {
 toast.error(e.message);
 }
 };

 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (view === 'create') {
 if (e.key === 'F2') {
 e.preventDefault();
 doc.actions.addLine();
 }
 if (e.key === 'F10') {
 e.preventDefault();
 handleSubmit();
 }
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [view, doc.state.lines, doc.state.partnerId]);

 if (view === 'create') return (
 <>
 <InvoiceForm onBack={() => setView('list')} onSubmit={handleSubmit} state={doc.state} setState={doc.setState} masters={doc.masters} actions={doc.actions} computations={doc.computations} setViewingBatch={setViewingBatch} />
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
  if (view === 'detail' && selectedInvoice) return (
 <>
 <InvoiceDetail invoice={selectedInvoice} onBack={() => setView('list')} masters={doc.masters} setViewingBatch={setViewingBatch} />
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

 return <InvoiceList doc={doc} data={invoices} loading={loading} partners={doc.masters.partners} onCreate={() => setView('create')} canWrite={doc.state.canWrite} onDetail={async (inv) => {  setLoading(true);
 try {
 const res = await fetch(`/api/sales/invoices/${inv.id}`, {
 headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' }
 });
 const data = await res.json();
 setSelectedInvoice(data);  setView('detail');  } catch (e) {
 toast.error('Error al cargar el detalle de la factura');
 } finally {
 setLoading(false);
 }
 }} />;
};
