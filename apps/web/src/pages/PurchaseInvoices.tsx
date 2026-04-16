import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  Table,
  Card,
  Button,
  Input,
  Loader,
  useToast,
  Badge,
  FilterBar,
  SearchableSelect,
  cn,
} from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { useTabs, useCurrentTab } from '../context/TabsContext';
import {
  FileStack,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  FileText,
  AlertCircle,
  Copy,
  PlusSquare,
  Barcode,
  Download,
} from 'lucide-react';
import { DocumentActionBar } from '../components/DocumentActionBar';
import { DocumentDetailLayout } from '../components/DocumentDetailLayout';
import { DocumentTotalsBlock } from '../components/DocumentTotalsBlock';
import {
  buildDetailLineColumns,
  buildFormLineColumns,
  statusBadgeProps,
} from '../components/documentLineCells';
import { notifyDocChange, useDataVersion } from '../utils/dataRefresh';
import { downloadPdf } from '../utils/downloadPdf';
import { useFormat } from '../hooks/useFormat';
import { useTheme } from '../context/ThemeContext';
import { BatchSelectionModal } from '../components/BatchSelectionModal';
import { BatchAssignmentPanel } from '../components/BatchAssignmentPanel';
import { useItemUoms } from '../hooks/useItemUoms';
import { PluginFieldsPanel } from '../components/PluginFieldsPanel';
import { useDocument, useDataTable, DocType, DocKind, DocSide } from '@openfactu/common';

// Eliminamos SerialBadges inline para usar el modo Popup limpio

// --- Sub-componente: VISTA DE LISTADO ---
const InvoiceList: React.FC<{
  data: any[];
  loading: boolean;
  partners: any[];
  onCreate: () => void;
  onDetail: (inv: any) => void;
  mastersError?: string | null;
  doc: any;
}> = ({ data, loading, partners, onCreate, onDetail, mastersError, doc }) => {
  const { token, user } = useAuth();
  const toast = useToast();
  const fmt = useFormat();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const handleQuickPdf = async (id: string) => {
    setDownloadingId(id);
    try {
      await downloadPdf(`/api/purchases/invoices/${id}/pdf`, token || '', user?.tenantId || '');
    } catch (e: any) {
      toast.error(e.message || 'Error al descargar PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const { filteredData, searchTerm, setSearchTerm, activeFilters, setFilter, clearFilters } =
    useDataTable({
      data,
      searchColumns: ['docCode', 'partnerName', 'total'] as any,
      filters: [
        {
          key: 'partnerId',
          type: 'select',
          label: 'Proveedor',
          options: partners.map((p) => ({ label: p.name, value: p.id })),
        },
        {
          key: 'status',
          type: 'select',
          label: 'Estado',
          options: [
            { label: 'Borrador', value: 'D' },
            { label: 'Asentado', value: 'O' },
            { label: 'Cancelado', value: 'X' },
          ],
        },
        { key: 'date', type: 'date', label: 'Fecha' },
      ],
    });

  const columns = [
    {
      header: 'Documento',
      accessor: (item: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-slate-100 leading-none">
            {item.seriesPrefix}-{item.periodCode}-{String(item.docNum).padStart(6, '0')}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 uppercase tracking-tighter">
            ID: {item.id.substring(0, 8)}
          </span>
        </div>
      ),
    },
    { header: 'Fecha', accessor: (item: any) => fmt.date(item.date) },
    {
      header: 'Proveedor',
      accessor: (item: any) => (
        <div>
          <p className="font-bold text-slate-700 dark:text-slate-200 leading-tight">
            {item.partnerName}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">
            CIE: {item.partnerId.substring(0, 6)}
          </p>
        </div>
      ),
    },
    {
      header: 'Desde Albarán',
      cell: (item: any) =>
        item.baseDocCode ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/30 text-[10px] font-black text-indigo-700 dark:text-indigo-200 uppercase tracking-tight">
            <FileText size={11} /> {item.baseDocCode}
          </span>
        ) : (
          <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold italic">
            Directa
          </span>
        ),
    },
    {
      header: 'Total',
      align: 'right' as const,
      accessor: (item: any) => (
        <span className="font-black text-slate-900 dark:text-slate-100">
          {fmt.money(item.total)}
        </span>
      ),
    },
    {
      header: 'Estado',
      align: 'center' as const,
      cell: (item: any) => {
        if (item.status === 'D') return <Badge variant="warning">Borrador</Badge>;
        if (item.status === 'O') return <Badge variant="success">Asentado</Badge>;
        if (item.status === 'X') return <Badge variant="error">Cancelado</Badge>;
        return <Badge variant="neutral">{item.status}</Badge>;
      },
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      cell: (item: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleQuickPdf(item.id);
          }}
          isLoading={downloadingId === item.id}
          className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-primary"
          title="Descargar PDF"
        >
          <Download size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-4 tracking-tighter">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl text-amber-600 dark:text-amber-300 shadow-sm border border-amber-100 dark:border-amber-500/20">
              <FileStack size={32} />
            </div>
            Facturas de Compra
          </h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 font-medium ml-1">
            Registro para el libro de IVA y pagos a proveedores.
          </p>
          {mastersError && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-200 text-xs font-bold animate-in slide-in-from-top">
              <AlertCircle size={16} />
              {mastersError}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={onCreate}
            disabled={!doc.state.canWrite}
            className="flex items-center gap-2 h-12 px-6 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:grayscale"
          >
            <Plus size={20} /> Nueva Factura Directa
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden" noPadding>
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilters={activeFilters}
          onFilterChange={setFilter}
          onClear={clearFilters}
          config={[
            {
              key: 'partnerId',
              label: 'Proveedor',
              type: 'select',
              options: partners.map((p) => ({ label: p.name, value: p.id })),
            },
            {
              key: 'status',
              label: 'Estado',
              type: 'select',
              options: [
                { label: 'Asentado', value: 'O' },
                { label: 'Cancelado', value: 'X' },
              ],
            },
            { key: 'date', label: 'Fecha', type: 'date' },
          ]}
          searchPlaceholder="Buscar por factura..."
        />
        <Table
          columns={columns}
          data={filteredData || []}
          isLoading={loading}
          onRowClick={onDetail}
        />
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
  const fmt = useFormat();
  const itemUoms = useItemUoms();

  const duplicateLine = (idx: number) => {
    const newLine = { ...state.lines[idx], batchDetails: [] };
    const newLines = [...state.lines];
    newLines.splice(idx + 1, 0, newLine);
    setState.setLines(newLines);
  };

  const columns = useMemo(
    () => buildFormLineColumns({
      kind: DocKind.Invoice,
      side: DocSide.Purchase,
      state,
      masters,
      actions,
      onAssignBatch: setBatchEditingIdx,
      onViewBatch: setViewingBatch,
      onDuplicateLine: duplicateLine,
      fmt,
      getItemUoms: itemUoms.get,
    }),
    [state.lines, masters.items, masters.taxGroups],
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-600 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter flex items-center gap-3">
              {state.lines.some((l: any) => l.baseId)
                ? 'Facturación de Albarán'
                : 'Nueva Factura Directa'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 font-medium ml-1 flex items-center gap-2">
              <FileText size={14} className="text-amber-500" />
              Ingreso de gasto y contabilización de impuestos.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => onSubmit()}
            isLoading={state.isSubmitting}
            disabled={!!state.seriesError || !state.canWrite}
            className="flex items-center gap-2 h-12 px-8 focus:ring-4 ring-blue-500/10 transition-all disabled:opacity-50"
          >
            <Save size={20} /> Asentar Factura
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 space-y-6 border-slate-100 dark:border-slate-800">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-baseline gap-4">
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] tracking-[0.15em] leading-none">
              Cabecera de Factura
            </h3>
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider leading-none">
              * Campos obligatorios
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Proveedor / Acreedor *
              </label>
              <SearchableSelect
                value={state.partnerId}
                onChange={setState.setPartnerId}
                options={masters.partners.map((p: any) => ({ label: p.name, value: p.id }))}
                placeholder="Seleccionar proveedor..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Fecha Factura *
              </label>
              <Input
                type="date"
                value={state.date}
                onChange={(e) => setState.setDate(e.target.value)}
                className="font-bold text-slate-700 dark:text-slate-200 h-10 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 space-y-6 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest border-b pb-2">
              Series y Periodo
            </h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  Serie de Numeración *
                </label>
                <SearchableSelect
                  value={state.seriesId}
                  onChange={setState.setSeriesId}
                  options={masters.series.map((s: any) => ({ label: s.name, value: s.id }))}
                />
                {state.seriesError && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1 italic">
                    {state.seriesError}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  Periodo Contable *
                </label>
                <SearchableSelect
                  value={state.periodId}
                  onChange={setState.setPeriodId}
                  options={masters.periods.map((p: any) => ({ label: p.name, value: p.id }))}
                />
              </div>
            </div>
          </Card>
          <PluginFieldsPanel
            tableName="PurchaseInvoice"
            values={state.pluginData}
            onChange={setState.setPluginField}
            disabled={state.isSubmitting}
            layout="sidebar"
          />
        </div>
      </div>

      <Card className="shadow-lg overflow-hidden border-slate-100 dark:border-slate-800" noPadding>
        <Table
          columns={columns}
          data={state.lines || []}
          emptyMessage="No hay líneas en la factura."
        />
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center border-t border-slate-100 dark:border-slate-800 gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => Array(1).fill(0).forEach(actions.addLine)}
                className="h-8 min-w-[36px] px-2 rounded-lg text-[10px] font-black bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 dark:text-slate-600 border border-transparent hover:border-slate-200 dark:border-slate-700 transition-all"
              >
                +1
              </button>
              <button
                onClick={() => Array(5).fill(0).forEach(actions.addLine)}
                className="h-8 min-w-[36px] px-2 rounded-lg text-[10px] font-black bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 dark:text-slate-600 border border-transparent hover:border-slate-200 dark:border-slate-700 transition-all"
              >
                +5
              </button>
              <button
                onClick={() => Array(10).fill(0).forEach(actions.addLine)}
                className="h-8 min-w-[36px] px-2 rounded-lg text-[10px] font-black bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 dark:text-slate-600 border border-transparent hover:border-slate-200 dark:border-slate-700 transition-all"
              >
                +10
              </button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => actions.addLine()}
              className="text-amber-600 dark:text-amber-300 font-bold flex items-center gap-2 h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <PlusSquare size={16} /> Línea de Gasto
            </Button>
          </div>
          <div className="flex flex-col items-end min-w-[240px] space-y-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between w-full text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
              <span>Base Imponible:</span>
              <span className="text-slate-600 dark:text-slate-300 dark:text-slate-600">
                {computations.subtotal.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between w-full text-[10px] font-black text-amber-500 uppercase tracking-widest px-1">
              <span>Cuota IVA:</span>
              <span>{computations.taxTotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between w-full pt-3 mt-1 border-t items-baseline px-1 border-slate-50">
              <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">
                Total Factura:
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter ml-4">
                {computations.total.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      </Card>

      <BatchAssignmentPanel
        isOpen={batchEditingIdx !== null}
        onClose={() => setBatchEditingIdx(null)}
        lines={state.lines}
        masters={masters}
        initialLineIdx={batchEditingIdx}
        isSale={false}
        onSave={(updates) => {
          updates.forEach((u) => actions.updateLine(u.idx, 'batchDetails', u.batchDetails));
        }}
      />
    </div>
  );
};

// --- Sub-componente: VISTA DE DETALLE ---
const InvoiceDetail: React.FC<{
  invoice: any;
  onBack: () => void;
  onCancel: (id: string) => void;
  onPost?: () => void;
  isPosting?: boolean;
  masters: any;
  setViewingBatch: (l: any) => void;
  canDelete?: boolean;
}> = ({ invoice, onBack, onCancel, onPost, isPosting, masters, setViewingBatch, canDelete }) => {
  const fmt = useFormat();
  const partner = masters.partners.find((p: any) => p.id === invoice.partnerId);
  const series = masters.series?.find((s: any) => s.id === invoice.seriesId);
  const period = masters.periods?.find((p: any) => p.id === invoice.periodId);
  const fromDelivery = invoice.lines?.some((l: any) => l.baseId);

  const columns = useMemo(
    () => buildDetailLineColumns({
      kind: DocKind.Invoice,
      side: DocSide.Purchase,
      masters,
      onViewBatch: setViewingBatch,
      fmt,
    }),
    [invoice.lines, masters.items, masters.taxGroups],
  );

  return (
    <DocumentDetailLayout
      onBack={onBack}
      breadcrumb="COMPRAS · FACTURA"
      title={`${invoice.seriesPrefix}-${invoice.periodCode}-${String(invoice.docNum).padStart(6, '0')}`}
      status={statusBadgeProps(invoice.status, DocKind.Invoice)}
      actions={
        <DocumentActionBar
          docType="PINV"
          pdfUrl={`/api/purchases/invoices/${invoice.id}/pdf`}
          onCancel={() => onCancel(invoice.id)}
          showCancel={(invoice.status === 'O' || invoice.status === 'D') && !!canDelete}
          primary={
            invoice.status === 'D' && onPost
              ? { label: 'Asentar Factura', icon: Save, onClick: onPost, isLoading: isPosting }
              : undefined
          }
        />
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="md:col-span-2 border-slate-100 dark:border-slate-800"
          bodyClassName="p-6 space-y-5"
        >
          <div>
            <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.15em] mb-2">
              Proveedor
            </h4>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {partner?.name || '—'}
            </p>
            {partner?.nif && (
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 font-mono">
                NIF: {partner.nif}
              </p>
            )}
          </div>
          {fromDelivery && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/30 rounded-xl">
              <Copy size={14} className="text-blue-600 dark:text-blue-300 shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-200 font-medium leading-tight">
                Factura generada desde uno o varios albaranes de compra.
              </p>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/30 rounded-xl">
            <FileText size={16} className="text-amber-600 dark:text-amber-300 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-tight">
              Documento contable firme — genera obligación de pago.
            </p>
          </div>
        </Card>

        <Card className="border-slate-100 dark:border-slate-800" bodyClassName="p-6 space-y-4">
          <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.15em] border-b border-slate-100 dark:border-slate-800 pb-2">
            Información
          </h4>
          <dl className="space-y-2.5">
            <div className="flex justify-between items-baseline gap-4">
              <dt className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Fecha
              </dt>
              <dd className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                {fmt.date(invoice.date)}
              </dd>
            </div>
            {series && (
              <div className="flex justify-between items-baseline gap-4">
                <dt className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Serie
                </dt>
                <dd className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {series.name}
                </dd>
              </div>
            )}
            {period && (
              <div className="flex justify-between items-baseline gap-4">
                <dt className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Periodo
                </dt>
                <dd className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {period.name}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden border-slate-100 dark:border-slate-800" noPadding>
        <Table columns={columns} data={invoice.lines || []} />
        <DocumentTotalsBlock
          subtotal={invoice.subtotal || 0}
          tax={invoice.taxTotal || 0}
          total={invoice.total || 0}
          totalLabel="Total Factura"
        />
      </Card>
    </DocumentDetailLayout>
  );
};

const formatDocCode = (inv: any): string =>
  `${inv.seriesPrefix}-${inv.periodCode}-${String(inv.docNum).padStart(6, '0')}`;

export const PurchaseInvoices: React.FC = () => {
  const { token, user } = useAuth();
  const { flags } = useTheme();
  const toast = useToast();
  const params = useParams();
  const location = useLocation();
  const { openTab } = useTabs();
  const currentTab = useCurrentTab();

  const detailId = params.id;
  const isCreate = location.pathname.endsWith('/new');
  const isDetail = !!detailId;
  const isList = !isCreate && !isDetail;

  const dataVersion = useDataVersion(DocType.PurchaseInvoice);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(isList);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(isDetail);
  const [viewingBatch, setViewingBatch] = useState<any>(null);
  const [posting, setPosting] = useState(false);

  const doc = useDocument({
    token: token || '',
    tenantId: user?.tenantId || '',
    docType: DocType.PurchaseInvoice,
    apiEndpoint: '/api/purchases/invoices',
    permissions: (user as any)?.permissions?.['/purchases/invoices'],
  });

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': user?.tenantId || '',
  };

  // Listado
  useEffect(() => {
    if (!isList || !token || !user?.tenantId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/purchases/invoices', { headers: authHeaders });
        const data = await res.json();
        const withCode = (Array.isArray(data) ? data : []).map((d: any) => ({
          ...d,
          docCode: `${d.seriesPrefix || ''}-${d.periodCode || ''}-${String(d.docNum || '').padStart(6, '0')}`,
          partnerName: d.partnerName || '',
        }));
        setInvoices(withCode);
      } catch (e) {
        toast.error('Error al cargar facturas');
      } finally {
        setLoading(false);
      }
    })();
  }, [isList, token, user?.tenantId, dataVersion]);

  // Detalle
  useEffect(() => {
    if (!isDetail || !detailId || !token || !user?.tenantId) return;
    (async () => {
      try {
        setDetailLoading(true);
        const res = await fetch(`/api/purchases/invoices/${detailId}`, { headers: authHeaders });
        if (!res.ok) throw new Error('No encontrada');
        const data = await res.json();
        setSelectedInvoice(data);
        currentTab.rename(formatDocCode(data));
      } catch (e: any) {
        toast.error(e.message || 'Error al cargar el detalle de la factura');
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [isDetail, detailId, token, user?.tenantId, dataVersion]);

  // Copy-from: /purchases/invoices/new?copyFrom=<id>
  useEffect(() => {
    if (!isCreate) return;
    const urlParams = new URLSearchParams(location.search);
    if (!urlParams.get('copyFrom')) return;
    const sourceData = localStorage.getItem('copy_pdn_source');
    if (!sourceData) return;
    try {
      const pdn = JSON.parse(sourceData);
      doc.setState.setPartnerId(pdn.partnerId);
      doc.setState.setLines(
        pdn.lines.map((l: any) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          price: l.price,
          taxGroupId: l.taxGroupId,
          warehouseId: l.warehouseId,
          zoneId: l.zoneId,
          batchDetails: l.batchDetails,
          baseType: 'PDN',
          baseId: pdn.id,
          baseLine: l.lineNum || l.id,
        })),
      );
    } catch (e) {
      console.error('Error parsing copy_pdn_source', e);
    }
  }, [isCreate]);

  const handleSubmit = async (extra?: any) => {
    try {
      await doc.actions.submitDocument(extra);
      toast.success('Factura asentada correctamente');
      notifyDocChange(DocType.PurchaseInvoice);
      currentTab.close();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCancel = async (id: string) => {
    if (
      flags.confirmBeforeCancel &&
      !confirm('¿Estás seguro de cancelar esta factura? Los albaranes se reabrirán.')
    )
      return;
    try {
      const res = await fetch(`/api/purchases/invoices/${id}/cancel`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al cancelar');
      }
      toast.success('Factura cancelada y stock/albaranes revertidos');
      notifyDocChange(DocType.PurchaseInvoice);
      currentTab.close();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePost = async () => {
    if (!selectedInvoice) return;
    try {
      setPosting(true);
      const res = await fetch(`/api/purchases/invoices/${selectedInvoice.id}/post`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al asentar');
      }
      toast.success('Factura asentada');
      notifyDocChange(DocType.PurchaseInvoice);
      setSelectedInvoice({ ...selectedInvoice, status: 'O' });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPosting(false);
    }
  };

  // Atajos creación
  useEffect(() => {
    if (!isCreate) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        doc.actions.addLine();
      }
      if (e.key === 'F10') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreate, doc.state.lines, doc.state.partnerId]);

  if (isCreate) {
    return (
      <>
        <InvoiceForm
          onBack={() => currentTab.close()}
          onSubmit={handleSubmit}
          state={doc.state}
          setState={doc.setState}
          masters={doc.masters}
          actions={doc.actions}
          computations={doc.computations}
          setViewingBatch={setViewingBatch}
        />
        {viewingBatch && (
          <BatchSelectionModal
            isOpen={true}
            onClose={() => setViewingBatch(null)}
            targetQuantity={viewingBatch.quantity}
            itemName={doc.masters.items.find((i: any) => i.id === viewingBatch.itemId)?.name || ''}
            manageBy={
              doc.masters.items.find((i: any) => i.id === viewingBatch.itemId)?.manageBy || 'B'
            }
            initialDetails={viewingBatch.batchDetails || []}
            onConfirm={() => {}}
            readOnly
          />
        )}
      </>
    );
  }

  if (isDetail) {
    if (detailLoading || !selectedInvoice) {
      return (
        <div className="p-12 flex items-center justify-center">
          <Loader />
        </div>
      );
    }
    return (
      <>
        <InvoiceDetail
          invoice={selectedInvoice}
          onBack={() => currentTab.close()}
          onCancel={handleCancel}
          onPost={handlePost}
          isPosting={posting}
          masters={doc.masters}
          setViewingBatch={setViewingBatch}
          canDelete={doc.state.canDelete}
        />
        {viewingBatch && (
          <BatchSelectionModal
            isOpen={true}
            onClose={() => setViewingBatch(null)}
            targetQuantity={viewingBatch.quantity}
            itemName={doc.masters.items.find((i: any) => i.id === viewingBatch.itemId)?.name || ''}
            manageBy={
              doc.masters.items.find((i: any) => i.id === viewingBatch.itemId)?.manageBy || 'B'
            }
            initialDetails={viewingBatch.batchDetails || []}
            onConfirm={() => {}}
            readOnly
          />
        )}
      </>
    );
  }

  return (
    <InvoiceList
      doc={doc}
      data={invoices}
      loading={loading}
      partners={doc.masters.partners}
      mastersError={doc.state.mastersError}
      onCreate={() => openTab('/purchases/invoices/new')}
      onDetail={(inv) => openTab(`/purchases/invoices/${inv.id}`, { title: formatDocCode(inv) })}
    />
  );
};
