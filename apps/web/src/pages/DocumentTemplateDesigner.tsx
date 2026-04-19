import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@openfactu/ui';
import {
  ArrowLeft,
  Save,
  FileDown,
  FileUp,
  Undo,
  Redo,
  Eye,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { TemplateRow } from '../components/document-templates/constants';
import {
  createEmptyLayout,
  type CanvasLayout,
  type Band,
  type BandKind,
} from '../components/document-templates/canvas/types';

const BAND_LABELS: Record<BandKind, string> = {
  pageHeader: 'Cabecera de página',
  docHeader: 'Cabecera del documento',
  detail: 'Detalle (líneas)',
  totals: 'Totales',
  pageFooter: 'Pie de página',
};

/**
 * Página a pantalla completa del diseñador visual de plantillas.
 *
 * Esta subfase (5) aterriza el esqueleto: ruta, layout de 3 columnas y
 * carga/guardado básico del layout canvas. La paleta, el DnD, el inspector
 * y el compilador real se conectan en subfases posteriores (6-12).
 */
export const DocumentTemplateDesigner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { token, user } = useAuth();

  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [layout, setLayout] = useState<CanvasLayout>(createEmptyLayout());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!rootRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      rootRef.current.requestFullscreen().catch(() => toast.error('Fullscreen no disponible'));
    }
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token ?? ''}`,
    'x-tenant-id': user?.tenantId ?? '',
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    if (!id || !user?.tenantId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/document-templates/${id}`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as TemplateRow & { canvasLayout?: CanvasLayout | null };
        if (cancelled) return;
        setTemplate(data);
        if (data.canvasLayout && data.canvasLayout.version === 1) {
          setLayout(data.canvasLayout);
        }
      } catch {
        toast.error('No se pudo cargar la plantilla');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.tenantId]);

  const handleBack = () => navigate('/document-templates');

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/document-templates/${template.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...template, canvasLayout: layout, legacyHtml: false }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Plantilla guardada');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        Cargando plantilla…
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 flex flex-col bg-slate-50 dark:bg-slate-950"
    >
      <Toolbar
        title={template?.name ?? 'Sin título'}
        onBack={handleBack}
        onSave={handleSave}
        saving={saving}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />
      <div className="flex flex-1 min-h-0">
        <PalettePanel />
        <CanvasArea layout={layout} />
        <InspectorPanel />
      </div>
    </div>
  );
};

// ---------- toolbar ----------

interface ToolbarProps {
  title: string;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  title,
  onBack,
  onSave,
  saving,
  onToggleFullscreen,
  isFullscreen,
}) => (
  <header className="flex items-center gap-2 px-4 h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <button
      onClick={onBack}
      className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
      title="Volver a plantillas"
    >
      <ArrowLeft size={18} />
    </button>
    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</div>
    <div className="flex-1" />
    <ToolbarButton icon={<Undo size={16} />} label="Deshacer" disabled />
    <ToolbarButton icon={<Redo size={16} />} label="Rehacer" disabled />
    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
    <ToolbarButton icon={<FileUp size={16} />} label="Importar" disabled />
    <ToolbarButton icon={<FileDown size={16} />} label="Exportar" disabled />
    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
    <ToolbarButton icon={<Eye size={16} />} label="Previsualizar" disabled />
    <button
      type="button"
      onClick={onToggleFullscreen}
      title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      className="p-2 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
    <button
      onClick={onSave}
      disabled={saving}
      className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
    >
      <Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}
    </button>
  </header>
);

const ToolbarButton: React.FC<{ icon: React.ReactNode; label: string; disabled?: boolean }> = ({
  icon,
  label,
  disabled,
}) => (
  <button
    disabled={disabled}
    title={label}
    className="flex items-center gap-1 px-2 py-1.5 rounded text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {icon}
  </button>
);

// ---------- paleta ----------

const PALETTE_ITEMS = [
  { kind: 'text', label: 'Texto' },
  { kind: 'image', label: 'Imagen' },
  { kind: 'shape', label: 'Forma' },
  { kind: 'spacer', label: 'Espaciador' },
  { kind: 'field', label: 'Campo' },
  { kind: 'linesTable', label: 'Tabla líneas' },
  { kind: 'totals', label: 'Totales' },
  { kind: 'qr', label: 'QR' },
  { kind: 'barcode', label: 'Código barras' },
];

const PalettePanel: React.FC = () => (
  <aside className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
    <div className="px-3 py-2 text-xs uppercase tracking-wide font-bold text-slate-400">
      Paleta
    </div>
    <ul className="px-2 pb-4 space-y-1">
      {PALETTE_ITEMS.map((it) => (
        <li
          key={it.kind}
          className="px-3 py-2 rounded border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 cursor-grab select-none"
        >
          {it.label}
        </li>
      ))}
    </ul>
  </aside>
);

// ---------- canvas ----------

const CanvasArea: React.FC<{ layout: CanvasLayout }> = ({ layout }) => (
  <main className="flex-1 min-w-0 overflow-auto flex justify-center py-8">
    <div
      className="bg-white dark:bg-slate-900 shadow-lg rounded"
      style={{ width: '210mm', minHeight: '297mm' }}
    >
      {layout.bands.map((b) => (
        <BandSlot key={b.id} band={b} />
      ))}
    </div>
  </main>
);

const BandSlot: React.FC<{ band: Band }> = ({ band }) => (
  <section
    className="relative border-b border-dashed border-slate-200 dark:border-slate-700"
    style={{ height: `${band.height}mm` }}
  >
    <div className="absolute top-1 left-2 text-[10px] uppercase tracking-wide font-bold text-slate-400 pointer-events-none">
      {BAND_LABELS[band.kind]}
    </div>
    {band.elements.length === 0 && (
      <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none">
        Arrastra aquí un componente
      </div>
    )}
  </section>
);

// ---------- inspector ----------

const InspectorPanel: React.FC = () => (
  <aside className="w-72 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
    <div className="px-3 py-2 text-xs uppercase tracking-wide font-bold text-slate-400">
      Inspector
    </div>
    <div className="px-3 py-4 text-sm text-slate-500">
      Selecciona un elemento para editar sus propiedades.
    </div>
  </aside>
);
