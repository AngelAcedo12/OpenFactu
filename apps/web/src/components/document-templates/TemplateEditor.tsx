import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Input, useToast, SearchableSelect, cn } from '@openfactu/ui';
import { ArrowLeft, Save, PanelRightOpen, PanelRightClose } from 'lucide-react';
import {
 buildVisualTemplate,
 parseMeta,
 DEFAULT_VISUAL_OPTIONS,
 type VisualOptions
} from '@openfactu/pdf/browser';
import { DOC_TYPE_OPTIONS, type DocType, type TemplateRow } from './constants';
import { ModeTabs, type EditorMode } from './ModeTabs';
import { VisualForm } from './VisualForm';
import { AdvancedEditor, type AdvancedEditorHandle } from './AdvancedEditor';
import { PreviewPane } from './PreviewPane';
import { usePreview } from './usePreview';
import { FieldExplorer } from './FieldExplorer';

interface Props {
 template: TemplateRow | null;
 onBack: () => void;
 onSave: (t: Partial<TemplateRow>) => Promise<void>;
 token: string;
 tenantId: string;
}

export const TemplateEditor: React.FC<Props> = ({ template, onBack, onSave, token, tenantId }) => {
 const toast = useToast();
 const initialMeta = template?.html ? parseMeta(template.html) : null;
 const isNewTemplate = !template;

 const [name, setName] = useState(template?.name || 'Nueva plantilla');
 const [docType, setDocType] = useState<DocType>(template?.docType || 'SINV');
 const [isDefault, setIsDefault] = useState(!!template?.isDefault);
 const [mode, setMode] = useState<EditorMode>(isNewTemplate || initialMeta ? 'visual' : 'advanced');
 const [visualOpts, setVisualOpts] = useState<VisualOptions>(initialMeta || DEFAULT_VISUAL_OPTIONS);
 const [html, setHtml] = useState(template?.html || buildVisualTemplate('SINV', DEFAULT_VISUAL_OPTIONS));
 const [saving, setSaving] = useState(false);
 const [explorerOpen, setExplorerOpen] = useState(true);

 const advancedEditorRef = useRef<AdvancedEditorHandle | null>(null);

 // En modo visual, regenerar el HTML cada vez que cambian los opts o el docType
 useEffect(() => {
 if (mode === 'visual') {
 setHtml(buildVisualTemplate(docType, visualOpts));
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [visualOpts, docType, mode]);

 const { previewUrl, previewing, refresh } = usePreview(
 html, docType, token, tenantId, (msg) => toast.error(msg)
 );

 const updateOpt = <K extends keyof VisualOptions>(key: K, value: VisualOptions[K]) => {
 setVisualOpts(prev => ({ ...prev, [key]: value }));
 };

 const switchToAdvanced = () => setMode('advanced');
 const switchToVisual = () => {
 if (mode === 'visual') return;
 const ok = confirm('Cambiar a modo Visual regenerará el HTML a partir del formulario y perderás los cambios manuales. ¿Continuar?');
 if (!ok) return;
 setMode('visual');
 };

 const handleSave = async () => {
 setSaving(true);
 try {
 await onSave({ id: template?.id, name, docType, html, isDefault });
 toast.success('Plantilla guardada');
 } catch (e: any) {
 toast.error(e.message);
 } finally {
 setSaving(false);
 }
 };

 const handleInsertField = (variablePath: string) => {
 if (mode === 'advanced' && advancedEditorRef.current) {
 advancedEditorRef.current.insertText(variablePath);
 }
 };

 return (
 <div className="h-full flex flex-col overflow-hidden p-6 gap-4 animate-in fade-in duration-300">
 {/* Header */}
 <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 flex-shrink-0">
 <div className="flex items-center gap-3">
 <button
 onClick={onBack}
 className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 dark:text-slate-600" >
 <ArrowLeft size={18} />
 </button>
 <div>
 <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
 {template ? 'Editar Plantilla' : 'Nueva Plantilla'}
 </h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">
 {mode === 'visual'
 ? 'Personaliza colores, logo y secciones desde el formulario. No necesitas saber HTML.'
 : 'Editor HTML avanzado con variables Handlebars. Vista previa en vivo.'}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button
 variant="secondary" onClick={() => setExplorerOpen(o => !o)}
 className="flex items-center gap-2 h-10" title={explorerOpen ? 'Ocultar campos' : 'Mostrar campos'}
 >
 {explorerOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
 Campos
 </Button>
 <Button onClick={handleSave} isLoading={saving} className="flex items-center gap-2 h-10 px-6">
 <Save size={16} /> Guardar
 </Button>
 </div>
 </div>

 {/* Metadata */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0">
 <div className="space-y-1">
 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nombre</label>
 <Input value={name} onChange={(e) => setName(e.target.value)} />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipo de documento</label>
 <SearchableSelect
 value={docType}
 onChange={(v) => setDocType(v as DocType)}
 options={DOC_TYPE_OPTIONS}
 />
 </div>
 <div className="flex items-end gap-2 pb-1">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox" checked={isDefault}
 onChange={(e) => setIsDefault(e.target.checked)}
 className="w-4 h-4" />
 <span className="text-xs font-bold text-slate-600 dark:text-slate-300 dark:text-slate-600 select-none">Usar como default para este tipo</span>
 </label>
 </div>
 </div>

 {/* Tabs de modo */}
 <div className="flex-shrink-0">
 <ModeTabs mode={mode} onVisual={switchToVisual} onAdvanced={switchToAdvanced} />
 </div>

 {/* Split: editor | preview | explorer (3 paneles flex) */}
 <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
 {/* Editor pane */}
 <div className="flex-1 min-w-0 min-h-0">
 <Card
 className="h-full border-slate-100 dark:border-slate-800" noPadding
 bodyClassName="h-full flex flex-col overflow-hidden" >
 {mode === 'visual' ? (
 <VisualForm opts={visualOpts} updateOpt={updateOpt} />
 ) : (
 <AdvancedEditor ref={advancedEditorRef} value={html} onChange={setHtml} />
 )}
 </Card>
 </div>

 {/* Preview pane */}
 <div className="flex-1 min-w-0 min-h-0">
 <PreviewPane previewUrl={previewUrl} previewing={previewing} onRefresh={refresh} />
 </div>

 {/* Field explorer pane (plegable) */}
 <div className={cn(
"transition-all duration-300 min-h-0",
 explorerOpen ?"lg:w-80 w-full":"w-0 overflow-hidden" )}>
 {explorerOpen && (
 <Card
 className="h-full border-slate-100 dark:border-slate-800" noPadding
 bodyClassName="h-full flex flex-col overflow-hidden" >
 <FieldExplorer
 onInsert={handleInsertField}
 insertMode={mode === 'advanced' ? 'insert' : 'copy'}
 />
 </Card>
 )}
 </div>
 </div>
 </div>
 );
};
