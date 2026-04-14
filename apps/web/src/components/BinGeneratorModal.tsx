import React, { useState } from 'react';
import { Card, Button, Input, Loader, useToast, Modal } from '@openfactu/ui';
import { LayoutGrid, Play, X, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BinGeneratorModalProps {
  warehouseId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const BinGeneratorModal: React.FC<BinGeneratorModalProps> = ({ warehouseId, onSuccess, onClose }) => {
  const [prefix, setPrefix] = useState('B');
  const [separator, setSeparator] = useState('-');
  const [aisleRange, setAisleRange] = useState({ start: 1, end: 5, padding: 2 });
  const [stackRange, setStackRange] = useState({ start: 1, end: 10, padding: 2 });
  const [levelRange, setLevelRange] = useState({ start: 1, end: 3, padding: 2 });
  
  const { token, user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const toast = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const tenantId = user?.tenantId || '';

      const res = await fetch(`/api/warehouses/${warehouseId}/generate-bins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId || ''
        },
        body: JSON.stringify({
          prefix,
          separator,
          aisleRange,
          stackRange,
          levelRange
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        onSuccess();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Fallo en la conexión');
    } finally {
      setIsGenerating(false);
    }
  };

  const total = (aisleRange.end - aisleRange.start + 1) * 
                (stackRange.end - stackRange.start + 1) * 
                (levelRange.end - levelRange.start + 1);

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="Generador Masivo de Ubicaciones (Motor Industrial)"
      subtitle="Crea mallas de almacenamiento complejas al instante mediante parámetros jerárquicos."
      maxWidth="2xl"
    >
        <div className="space-y-6">
          {/* Configuración Nomenclatura */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <Input 
              label="Prefijo" 
              placeholder="Ej: B, P, R..." 
              value={prefix} 
              onChange={(e) => setPrefix(e.target.value)} 
            />
            <Input 
              label="Separador" 
              placeholder="Ej: -, /, ." 
              value={separator} 
              onChange={(e) => setSeparator(e.target.value)} 
            />
          </div>

          {/* Rango de Pasillos */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
              <LayoutGrid size={12} /> Definición de Segmentos
            </p>
            
            <div className="grid grid-cols-3 gap-4 border-l-4 border-blue-500 pl-4 py-2">
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500">Pasillo (Aisle)</p>
                <div className="flex gap-2">
                  <Input type="number" value={aisleRange.start} onChange={(e) => setAisleRange({...aisleRange, start: parseInt(e.target.value)})} className="h-8" />
                  <span className="text-slate-300">al</span>
                  <Input type="number" value={aisleRange.end} onChange={(e) => setAisleRange({...aisleRange, end: parseInt(e.target.value)})} className="h-8" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500">Columna (Stack)</p>
                <div className="flex gap-2">
                  <Input type="number" value={stackRange.start} onChange={(e) => setStackRange({...stackRange, start: parseInt(e.target.value)})} className="h-8" />
                  <span className="text-slate-300">al</span>
                  <Input type="number" value={stackRange.end} onChange={(e) => setStackRange({...stackRange, end: parseInt(e.target.value)})} className="h-8" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500">Nivel (Level)</p>
                <div className="flex gap-2">
                  <Input type="number" value={levelRange.start} onChange={(e) => setLevelRange({...levelRange, start: parseInt(e.target.value)})} className="h-8" />
                  <span className="text-slate-300">al</span>
                  <Input type="number" value={levelRange.end} onChange={(e) => setLevelRange({...levelRange, end: parseInt(e.target.value)})} className="h-8" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-3 text-blue-700">
              <Info size={20} />
              <div>
                <p className="text-xs font-bold">Resumen de Operación</p>
                <p className="text-[11px] font-medium opacity-80">Se generarán {total} ubicaciones únicas (ej: {prefix}01{separator}01{separator}01).</p>
              </div>
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || total <= 0} 
              className="shadow-lg shadow-blue-500/20"
            >
              {isGenerating ? <Loader size="sm" variant="white" /> : <div className="flex items-center gap-2"><Play size={16} /> Generar Bins</div>}
            </Button>
          </div>
        </div>
    </Modal>
  );
};
