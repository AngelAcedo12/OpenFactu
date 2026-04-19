import React, { useMemo } from 'react';
import { Table, Card, Button, Badge, Loader } from '@openfactu/ui';
import { FileCode, Plus, Trash2, Copy, Star, AlertCircle } from 'lucide-react';
import { DOC_TYPE_LABELS, DOC_TYPE_COLORS, type DocType, type TemplateRow } from './constants';

interface Props {
  data: TemplateRow[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (t: TemplateRow) => void;
  onSetDefault: (t: TemplateRow) => Promise<void>;
  onDuplicate: (t: TemplateRow) => Promise<void>;
  onDelete: (t: TemplateRow) => Promise<void>;
}

export const TemplatesList: React.FC<Props> = ({
  data,
  loading,
  onCreate,
  onEdit,
  onSetDefault,
  onDuplicate,
  onDelete,
}) => {
  const grouped = useMemo(() => {
    const map: Record<string, TemplateRow[]> = {};
    for (const row of data) {
      if (!map[row.docType]) map[row.docType] = [];
      map[row.docType].push(row);
    }
    return map;
  }, [data]);

  const columns = [
    {
      header: 'Nombre',
      accessor: (item: TemplateRow) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
          {item.isDefault && (
            <Badge variant="success" className="text-[9px] font-black uppercase">
              Default
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Última actualización',
      accessor: (item: TemplateRow) =>
        item.updatedAt ? new Date(item.updatedAt).toLocaleString('es-ES') : '—',
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      cell: (item: TemplateRow) => (
        <div className="flex items-center justify-end gap-1">
          {!item.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: any) => {
                e.stopPropagation();
                onSetDefault(item);
              }}
              title="Marcar como default"
            >
              <Star size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: any) => {
              e.stopPropagation();
              onDuplicate(item);
            }}
            title="Duplicar"
          >
            <Copy size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: any) => {
              e.stopPropagation();
              onDelete(item);
            }}
            title="Borrar"
            className="text-rose-500 hover:text-rose-700"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-4 tracking-tighter">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm border border-indigo-100">
              <FileCode size={32} />
            </div>
            Plantillas de Documento
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium ml-1">
            Formatos PDF personalizables para facturas, albaranes y pedidos.
          </p>
        </div>
        <Button
          onClick={onCreate}
          className="flex items-center gap-2 shadow-xl shadow-indigo-500/10 h-12 px-6"
        >
          <Plus size={20} /> Nueva Plantilla
        </Button>
      </div>

      {loading && <Loader />}

      {!loading &&
        (Object.keys(DOC_TYPE_LABELS) as DocType[]).map((docType) => {
          const rows = grouped[docType] || [];
          return (
            <Card
              key={docType}
              className="overflow-hidden shadow-lg dark:bg-transparent border-slate-100 dark:border-slate-800"
              noPadding
            >
              <div
                className={`px-6 py-3 border-b flex items-center justify-between ${DOC_TYPE_COLORS[docType]}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {docType}
                  </span>
                  <span className="font-bold text-sm">{DOC_TYPE_LABELS[docType]}</span>
                </div>
                <span className="text-[10px] font-bold opacity-70">{rows.length} plantilla(s)</span>
              </div>
              {rows.length === 0 ? (
                <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm italic flex items-center justify-center gap-2">
                  <AlertCircle size={14} /> Sin plantillas para este tipo
                </div>
              ) : (
                <Table columns={columns} data={rows} onRowClick={onEdit} />
              )}
            </Card>
          );
        })}
    </div>
  );
};
