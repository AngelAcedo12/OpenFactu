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
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useAuth } from '../context/AuthContext';
import type { TemplateRow } from '../components/document-templates/constants';
import {
  createEmptyLayout,
  type CanvasLayout,
  type Band,
  type BandKind,
  type CanvasElement,
  type ElementKind,
} from '../components/document-templates/canvas/types';
import { compileCanvas } from '../components/document-templates/canvas/compileCanvas';

const BAND_LABELS: Record<BandKind, string> = {
  pageHeader: 'Cabecera de página',
  docHeader: 'Cabecera del documento',
  detail: 'Detalle (líneas)',
  totals: 'Totales',
  pageFooter: 'Pie de página',
};

const PALETTE_ITEMS: { kind: ElementKind; label: string }[] = [
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

/** Tamaño por defecto en mm cuando se suelta un elemento de la paleta. */
const DEFAULT_SIZE: Record<ElementKind, { w: number; h: number }> = {
  text: { w: 60, h: 8 },
  image: { w: 40, h: 20 },
  shape: { w: 60, h: 4 },
  spacer: { w: 60, h: 6 },
  field: { w: 60, h: 8 },
  linesTable: { w: 180, h: 80 },
  totals: { w: 80, h: 30 },
  qr: { w: 25, h: 25 },
  barcode: { w: 60, h: 15 },
};

/** Constante CSS: 1mm = 3.779527 px a 96 DPI. */
const PX_PER_MM = 3.779527559;

let nextId = 1;
const genId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${nextId++}`;

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
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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

  const handleSave = async (opts: { returnAfter?: boolean } = {}) => {
    if (!template) return;
    setSaving(true);
    try {
      const html = compileCanvas(layout, { docType: template.docType });
      const res = await fetch(`/api/document-templates/${template.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...template,
          canvasLayout: layout,
          html,
          legacyHtml: false,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Plantilla guardada');
      if (opts.returnAfter) navigate('/document-templates');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    if (!over) return;
    const targetBandId = String(over.id);
    const data = active.data.current as
      | { action: 'create'; kind: ElementKind }
      | { action: 'move'; bandId: string; elementId: string }
      | undefined;
    if (!data) return;

    if (data.action === 'create') {
      const activatorRect = event.over?.rect;
      const pointer = (event.activatorEvent as PointerEvent) ?? null;
      let xMm = 5;
      let yMm = 5;
      if (activatorRect && pointer) {
        const pxX = pointer.clientX + delta.x - activatorRect.left;
        const pxY = pointer.clientY + delta.y - activatorRect.top;
        xMm = Math.max(0, Math.round(pxX / PX_PER_MM));
        yMm = Math.max(0, Math.round(pxY / PX_PER_MM));
      }
      const size = DEFAULT_SIZE[data.kind];
      const newEl = buildDefaultElement(data.kind, xMm, yMm, size.w, size.h);
      setLayout((prev) => ({
        ...prev,
        bands: prev.bands.map((b) =>
          b.id === targetBandId ? { ...b, elements: [...b.elements, newEl] } : b,
        ),
      }));
      setSelectedElementId(newEl.id);
      return;
    }

    // Mover elemento existente: actualizar x,y (convertir delta px→mm) y, si la
    // banda destino difiere, moverlo de banda.
    const dxMm = Math.round(delta.x / PX_PER_MM);
    const dyMm = Math.round(delta.y / PX_PER_MM);
    setLayout((prev) => {
      const sourceBand = prev.bands.find((b) => b.id === data.bandId);
      const el = sourceBand?.elements.find((e) => e.id === data.elementId);
      if (!el) return prev;
      const updated: CanvasElement = {
        ...el,
        x: Math.max(0, el.x + dxMm),
        y: Math.max(0, el.y + dyMm),
      };
      return {
        ...prev,
        bands: prev.bands.map((b) => {
          if (b.id === data.bandId && data.bandId === targetBandId) {
            return { ...b, elements: b.elements.map((e) => (e.id === el.id ? updated : e)) };
          }
          if (b.id === data.bandId) {
            return { ...b, elements: b.elements.filter((e) => e.id !== el.id) };
          }
          if (b.id === targetBandId) {
            return { ...b, elements: [...b.elements, updated] };
          }
          return b;
        }),
      };
    });
  };

  const handleDeleteElement = (bandId: string, elementId: string) => {
    setLayout((prev) => ({
      ...prev,
      bands: prev.bands.map((b) =>
        b.id === bandId ? { ...b, elements: b.elements.filter((e) => e.id !== elementId) } : b,
      ),
    }));
    if (selectedElementId === elementId) setSelectedElementId(null);
  };

  const handleUpdateElement = (elementId: string, patch: Partial<CanvasElement>) => {
    setLayout((prev) => ({
      ...prev,
      bands: prev.bands.map((b) => ({
        ...b,
        elements: b.elements.map((e) => (e.id === elementId ? ({ ...e, ...patch } as CanvasElement) : e)),
      })),
    }));
  };

  const selectedElement =
    selectedElementId == null
      ? null
      : layout.bands.flatMap((b) => b.elements).find((e) => e.id === selectedElementId) ?? null;

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
        onSave={() => handleSave({ returnAfter: true })}
        saving={saving}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 min-h-0">
          <PalettePanel />
          <CanvasArea
            layout={layout}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onDeleteElement={handleDeleteElement}
          />
          <InspectorPanel element={selectedElement} onChange={handleUpdateElement} />
        </div>
      </DndContext>
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

const PalettePanel: React.FC = () => (
  <aside className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
    <div className="px-3 py-2 text-xs uppercase tracking-wide font-bold text-slate-400">
      Paleta
    </div>
    <ul className="px-2 pb-4 space-y-1">
      {PALETTE_ITEMS.map((it) => (
        <PaletteItem key={it.kind} kind={it.kind} label={it.label} />
      ))}
    </ul>
  </aside>
);

const PaletteItem: React.FC<{ kind: ElementKind; label: string }> = ({ kind, label }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${kind}`,
    data: { action: 'create', kind },
  });
  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`px-3 py-2 rounded border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 cursor-grab select-none active:cursor-grabbing bg-white dark:bg-slate-800 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {label}
    </li>
  );
};

// ---------- canvas ----------

interface CanvasAreaProps {
  layout: CanvasLayout;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onDeleteElement: (bandId: string, elementId: string) => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  layout,
  selectedElementId,
  onSelectElement,
  onDeleteElement,
}) => (
  <main
    className="flex-1 min-w-0 overflow-auto flex justify-center py-8 bg-slate-100 dark:bg-slate-900"
    onMouseDown={(e) => {
      // Deseleccionar al hacer click fuera de un elemento.
      if (e.target === e.currentTarget) onSelectElement(null);
    }}
  >
    <div
      className="bg-white dark:bg-slate-950 shadow-lg rounded overflow-hidden"
      style={{ width: '210mm', minHeight: '297mm' }}
    >
      {layout.bands.map((b) => (
        <BandSlot
          key={b.id}
          band={b}
          selectedElementId={selectedElementId}
          onSelectElement={onSelectElement}
          onDeleteElement={onDeleteElement}
        />
      ))}
    </div>
  </main>
);

interface BandSlotProps {
  band: Band;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onDeleteElement: (bandId: string, elementId: string) => void;
}

const BandSlot: React.FC<BandSlotProps> = ({
  band,
  selectedElementId,
  onSelectElement,
  onDeleteElement,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: band.id });
  return (
    <section
      ref={setNodeRef}
      className={`relative border-b border-dashed transition-colors ${
        isOver
          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400'
          : 'border-slate-200 dark:border-slate-700'
      }`}
      style={{ height: `${band.height}mm` }}
    >
      <div className="absolute top-1 left-2 text-[10px] uppercase tracking-wide font-bold text-slate-400 pointer-events-none z-10">
        {BAND_LABELS[band.kind]}
      </div>
      {band.elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none">
          {isOver ? 'Suelta aquí' : 'Arrastra aquí un componente'}
        </div>
      )}
      {band.elements.map((el) => (
        <ElementBox
          key={el.id}
          element={el}
          bandId={band.id}
          selected={el.id === selectedElementId}
          onSelect={() => onSelectElement(el.id)}
          onDelete={() => onDeleteElement(band.id, el.id)}
        />
      ))}
    </section>
  );
};

interface ElementBoxProps {
  element: CanvasElement;
  bandId: string;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const ElementBox: React.FC<ElementBoxProps> = ({
  element,
  bandId,
  selected,
  onSelect,
  onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `el-${element.id}`,
    data: { action: 'move', bandId, elementId: element.id },
  });
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}mm`,
    top: `${element.y}mm`,
    width: `${element.w}mm`,
    height: `${element.h}mm`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : selected ? 20 : 10,
  };
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onDelete();
        }
      }}
      tabIndex={0}
      style={style}
      className={`rounded cursor-move select-none outline-none touch-none overflow-hidden ${
        selected
          ? 'ring-2 ring-blue-500'
          : 'ring-1 ring-slate-300 dark:ring-slate-600 hover:ring-slate-400'
      }`}
    >
      <ElementPreview element={element} />
    </div>
  );
};

const ElementPreview: React.FC<{ element: CanvasElement }> = ({ element }) => {
  const s = element.style ?? {};
  const base: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontSize: s.fontSize ? `${s.fontSize}pt` : '10pt',
    color: s.color,
    fontWeight: s.fontWeight,
    fontStyle: s.fontStyle,
    textAlign: s.textAlign,
    fontFamily: s.fontFamily,
    backgroundColor: s.backgroundColor,
    padding: s.padding ? `${s.padding}px` : '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      s.textAlign === 'center' ? 'center' : s.textAlign === 'right' ? 'flex-end' : 'flex-start',
    overflow: 'hidden',
  };

  switch (element.kind) {
    case 'text':
      return (
        <div style={base} className="whitespace-pre-wrap break-words">
          {element.text || <span className="text-slate-400 italic">Texto</span>}
        </div>
      );
    case 'image':
      return element.src ? (
        <img
          src={element.src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: element.fit ?? 'contain' }}
          draggable={false}
        />
      ) : (
        <div style={base} className="text-slate-400 italic">
          🖼 (elige imagen)
        </div>
      );
    case 'shape':
      if (element.shape === 'line') {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderTop: `${s.borderWidth ?? 1}px ${s.borderStyle ?? 'solid'} ${s.borderColor ?? '#000'}`,
            }}
          />
        );
      }
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            border: `${s.borderWidth ?? 1}px ${s.borderStyle ?? 'solid'} ${s.borderColor ?? '#000'}`,
            backgroundColor: s.backgroundColor ?? 'transparent',
          }}
        />
      );
    case 'spacer':
      return (
        <div style={base} className="text-slate-300 italic">
          ␣
        </div>
      );
    case 'field':
      return (
        <div style={base} className="font-mono text-slate-700 dark:text-slate-300">
          {element.prefix}
          {`{{${element.path || 'campo'}}}`}
          {element.suffix}
        </div>
      );
    case 'linesTable':
      return (
        <div className="w-full h-full bg-white dark:bg-slate-800 p-1">
          <table className="w-full text-[8pt] border-collapse">
            {element.showHeader !== false && (
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700">
                  {element.columns.map((c) => (
                    <th
                      key={c.id}
                      style={{ width: `${c.widthPct}%`, textAlign: c.align ?? 'left' }}
                      className="px-1 border-b border-slate-200 dark:border-slate-600 font-semibold"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              <tr>
                {element.columns.map((c) => (
                  <td
                    key={c.id}
                    style={{ textAlign: c.align ?? 'left' }}
                    className="px-1 text-slate-400 italic"
                  >
                    {`{{${c.path}}}`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );
    case 'totals':
      return (
        <div className="w-full h-full px-1 flex flex-col justify-end text-[9pt]">
          {element.showSubtotal !== false && (
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono text-slate-400">{`{{doc.subtotal}}`}</span>
            </div>
          )}
          {element.showTaxBreakdown !== false && (
            <div className="flex justify-between text-slate-500">
              <span>IVA …</span>
              <span className="font-mono text-slate-400">{`{{…}}`}</span>
            </div>
          )}
          {element.showTotal !== false && (
            <div className="flex justify-between border-t border-slate-400 mt-0.5 font-bold">
              <span>Total</span>
              <span className="font-mono">{`{{doc.total}}`}</span>
            </div>
          )}
        </div>
      );
    case 'qr':
      return (
        <div style={base} className="justify-center text-slate-400">
          <div className="w-full h-full border border-dashed border-slate-400 flex items-center justify-center text-[8pt]">
            QR
          </div>
        </div>
      );
    case 'barcode':
      return (
        <div style={base} className="justify-center text-slate-500 text-[8pt]">
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="h-full w-full bg-[repeating-linear-gradient(90deg,#000_0_2px,transparent_2px_4px)]" />
            {element.includeText && <span className="font-mono">{`{{${element.value}}}`}</span>}
          </div>
        </div>
      );
  }
};

// ---------- inspector ----------

interface InspectorPanelProps {
  element: CanvasElement | null;
  onChange: (id: string, patch: Partial<CanvasElement>) => void;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({ element, onChange }) => (
  <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
    <div className="px-3 py-2 text-xs uppercase tracking-wide font-bold text-slate-400">
      Inspector
    </div>
    {element ? (
      <ElementInspector element={element} onChange={onChange} />
    ) : (
      <div className="px-3 py-4 text-sm text-slate-500">
        Selecciona un elemento para editar sus propiedades.
      </div>
    )}
  </aside>
);

const ElementInspector: React.FC<{
  element: CanvasElement;
  onChange: (id: string, patch: Partial<CanvasElement>) => void;
}> = ({ element, onChange }) => {
  const patch = (p: Partial<CanvasElement>) => onChange(element.id, p);
  return (
    <div className="px-3 py-3 space-y-4 text-sm">
      <div className="text-[11px] uppercase tracking-wide font-bold text-slate-500">
        {element.kind}
      </div>

      {/* Geometría común */}
      <Section title="Geometría">
        <NumberGrid>
          <NumberField label="X (mm)" value={element.x} onChange={(v) => patch({ x: v } as any)} />
          <NumberField label="Y (mm)" value={element.y} onChange={(v) => patch({ y: v } as any)} />
          <NumberField
            label="Ancho (mm)"
            value={element.w}
            onChange={(v) => patch({ w: Math.max(1, v) } as any)}
          />
          <NumberField
            label="Alto (mm)"
            value={element.h}
            onChange={(v) => patch({ h: Math.max(1, v) } as any)}
          />
        </NumberGrid>
      </Section>

      {/* Props específicas por tipo */}
      {element.kind === 'text' && (
        <Section title="Contenido">
          <textarea
            value={element.text}
            onChange={(e) => patch({ text: e.target.value } as any)}
            rows={3}
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            placeholder="Texto a mostrar"
          />
        </Section>
      )}

      {element.kind === 'image' && (
        <Section title="Imagen">
          <label className="flex items-center justify-center text-xs px-3 py-6 rounded border-2 border-dashed border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const dataUrl = await fileToDataUrl(file);
                patch({ src: dataUrl } as any);
              }}
            />
            {element.src ? 'Cambiar imagen' : 'Seleccionar archivo'}
          </label>
          {element.src && (
            <img
              src={element.src}
              alt="preview"
              className="mt-2 max-h-20 mx-auto rounded border border-slate-200 dark:border-slate-700"
            />
          )}
          <Label>O pega una URL</Label>
          <input
            type="text"
            value={element.src.startsWith('data:') ? '' : element.src}
            onChange={(e) => patch({ src: e.target.value } as any)}
            placeholder="https://..."
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
          <Label>Ajuste</Label>
          <select
            value={element.fit ?? 'contain'}
            onChange={(e) => patch({ fit: e.target.value as any } as any)}
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="contain">Contener (sin recortar)</option>
            <option value="cover">Cubrir (rellenar)</option>
            <option value="fill">Estirar</option>
          </select>
        </Section>
      )}

      {element.kind === 'shape' && (
        <Section title="Forma">
          <Label>Tipo</Label>
          <select
            value={element.shape}
            onChange={(e) => patch({ shape: e.target.value as any } as any)}
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="line">Línea</option>
            <option value="rect">Rectángulo</option>
          </select>
          <Label>Color de borde</Label>
          <input
            type="color"
            value={element.style?.borderColor ?? '#000000'}
            onChange={(e) =>
              patch({
                style: { ...(element.style ?? {}), borderColor: e.target.value },
              } as any)
            }
            className="h-8 w-full rounded border border-slate-200 dark:border-slate-700"
          />
        </Section>
      )}

      {element.kind === 'field' && (
        <Section title="Campo">
          <Label>Path (Handlebars)</Label>
          <input
            type="text"
            value={element.path}
            onChange={(e) => patch({ path: e.target.value } as any)}
            placeholder="doc.docCode"
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
          />
          <Label>Formato</Label>
          <select
            value={element.format ?? ''}
            onChange={(e) =>
              patch({ format: (e.target.value || undefined) as any } as any)
            }
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">Sin formato</option>
            <option value="currency">Moneda</option>
            <option value="number">Número</option>
            <option value="date">Fecha</option>
            <option value="percent">Porcentaje</option>
          </select>
          <Label>Prefijo</Label>
          <input
            type="text"
            value={element.prefix ?? ''}
            onChange={(e) => patch({ prefix: e.target.value || undefined } as any)}
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
          <Label>Sufijo</Label>
          <input
            type="text"
            value={element.suffix ?? ''}
            onChange={(e) => patch({ suffix: e.target.value || undefined } as any)}
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </Section>
      )}

      {element.kind === 'totals' && (
        <Section title="Totales a mostrar">
          <Toggle
            label="Subtotal"
            checked={element.showSubtotal !== false}
            onChange={(v) => patch({ showSubtotal: v } as any)}
          />
          <Toggle
            label="Desglose IVA"
            checked={element.showTaxBreakdown !== false}
            onChange={(v) => patch({ showTaxBreakdown: v } as any)}
          />
          <Toggle
            label="Total"
            checked={element.showTotal !== false}
            onChange={(v) => patch({ showTotal: v } as any)}
          />
        </Section>
      )}

      {element.kind === 'qr' && (
        <Section title="QR">
          <Label>Valor (path o literal)</Label>
          <input
            type="text"
            value={element.value}
            onChange={(e) => patch({ value: e.target.value } as any)}
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
          />
        </Section>
      )}

      {element.kind === 'barcode' && (
        <Section title="Código de barras">
          <Label>Valor (path o literal)</Label>
          <input
            type="text"
            value={element.value}
            onChange={(e) => patch({ value: e.target.value } as any)}
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
          />
          <Label>Simbología</Label>
          <select
            value={element.symbology}
            onChange={(e) => patch({ symbology: e.target.value as any } as any)}
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="code128">Code 128</option>
            <option value="code39">Code 39</option>
            <option value="ean13">EAN-13</option>
            <option value="ean8">EAN-8</option>
          </select>
          <Toggle
            label="Mostrar texto legible"
            checked={element.includeText ?? false}
            onChange={(v) => patch({ includeText: v } as any)}
          />
        </Section>
      )}

      {element.kind === 'linesTable' && (
        <Section title="Tabla de líneas">
          <Toggle
            label="Mostrar cabecera"
            checked={element.showHeader !== false}
            onChange={(v) => patch({ showHeader: v } as any)}
          />
          <div className="text-[11px] text-slate-400">
            {element.columns.length} columnas. Edición avanzada de columnas en próximo paso.
          </div>
        </Section>
      )}

      {/* Estilo común */}
      {'style' in element && element.kind !== 'shape' && element.kind !== 'image' && (
        <Section title="Estilo">
          <Label>Tamaño fuente (pt)</Label>
          <input
            type="number"
            value={element.style?.fontSize ?? ''}
            onChange={(e) =>
              patch({
                style: {
                  ...(element.style ?? {}),
                  fontSize: e.target.value ? Number(e.target.value) : undefined,
                },
              } as any)
            }
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
          <Label>Color</Label>
          <input
            type="color"
            value={element.style?.color ?? '#000000'}
            onChange={(e) =>
              patch({ style: { ...(element.style ?? {}), color: e.target.value } } as any)
            }
            className="h-8 w-full rounded border border-slate-200 dark:border-slate-700"
          />
          <Label>Alineación</Label>
          <select
            value={element.style?.textAlign ?? 'left'}
            onChange={(e) =>
              patch({
                style: { ...(element.style ?? {}), textAlign: e.target.value as any },
              } as any)
            }
            className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
            <option value="justify">Justificado</option>
          </select>
        </Section>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <div className="text-[11px] uppercase tracking-wide font-bold text-slate-400">{title}</div>
    <div className="space-y-2">{children}</div>
  </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{children}</div>
);

const NumberGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 gap-2">{children}</div>
);

const NumberField: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({
  label,
  value,
  onChange,
}) => (
  <label className="block">
    <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
    />
  </label>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({
  label,
  checked,
  onChange,
}) => (
  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="accent-blue-600"
    />
    {label}
  </label>
);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- factoría de elementos ----------

function buildDefaultElement(
  kind: ElementKind,
  x: number,
  y: number,
  w: number,
  h: number,
): CanvasElement {
  const base = { id: genId(kind), x, y, w, h };
  switch (kind) {
    case 'text':
      return { ...base, kind, text: 'Texto' };
    case 'image':
      return { ...base, kind, src: '', fit: 'contain' };
    case 'shape':
      return { ...base, kind, shape: 'line' };
    case 'spacer':
      return { ...base, kind };
    case 'field':
      return { ...base, kind, path: 'doc.docCode' };
    case 'linesTable':
      return {
        ...base,
        kind,
        columns: [
          { id: genId('col'), label: 'Artículo', path: 'itemName', widthPct: 50, align: 'left' },
          {
            id: genId('col'),
            label: 'Cant.',
            path: 'quantity',
            widthPct: 15,
            align: 'right',
            format: 'number',
          },
          {
            id: genId('col'),
            label: 'Precio',
            path: 'price',
            widthPct: 17,
            align: 'right',
            format: 'currency',
          },
          {
            id: genId('col'),
            label: 'Total',
            path: 'lineTotal',
            widthPct: 18,
            align: 'right',
            format: 'currency',
          },
        ],
        showHeader: true,
      };
    case 'totals':
      return { ...base, kind };
    case 'qr':
      return { ...base, kind, value: 'verifactu.qrPayload' };
    case 'barcode':
      return { ...base, kind, value: 'doc.docCode', symbology: 'code128', includeText: true };
  }
}
