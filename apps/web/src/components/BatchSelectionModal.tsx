import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Card, cn } from '@openfactu/ui';
import { Trash2, Plus, AlertCircle, CheckCircle2, ChevronRight, Barcode } from 'lucide-react';

interface BatchDetail {
  batchNum: string;
  quantity: number;
  expiryDate?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: BatchDetail[]) => void;
  targetQuantity: number;
  itemName: number | string;
  initialDetails?: BatchDetail[];
  manageBy: 'B' | 'S'; // B: Batch, S: Serial
  readOnly?: boolean;
  itemId?: string;
  warehouseId?: string;
  isSale?: boolean;
}

export const BatchSelectionModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  targetQuantity, 
  itemName,
  initialDetails = [],
  manageBy,
  readOnly = false,
  itemId,
  warehouseId,
  isSale = false
}) => {
  const [details, setDetails] = useState<BatchDetail[]>(initialDetails.length > 0 ? initialDetails : [{ batchNum: '', quantity: manageBy === 'S' ? 1 : targetQuantity }]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSale && itemId && isOpen) {
      setLoading(true);
      fetch(`/api/items/${itemId}/batches?warehouseId=${warehouseId || ''}`)
        .then(res => res.json())
        .then(data => {
          setAvailableBatches(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isSale, itemId, warehouseId, isOpen]);
  
  const totalAssigned = details.reduce((acc, curr) => acc + Number(curr.quantity), 0);
  const isBalanced = Math.abs(totalAssigned - Number(targetQuantity)) < 0.00001;

  const addLine = () => {
    setDetails([...details, { batchNum: '', quantity: manageBy === 'S' ? 1 : 0 }]);
  };

  const removeLine = (idx: number) => {
    setDetails(details.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof BatchDetail, value: any) => {
    const newDetails = [...details];
    newDetails[idx] = { ...newDetails[idx], [field]: value };
    setDetails(newDetails);
  };

  const handleConfirm = () => {
    if (!isBalanced) return;
    onConfirm(details.filter(d => d.batchNum.trim() !== ''));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Asignación de ${manageBy === 'B' ? 'Lotes' : 'Series'}: ${itemName}`} maxWidth="2xl">
      <div className="space-y-6 p-1 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cantidad Requerida</p>
            <p className="text-2xl font-black text-slate-800">{targetQuantity}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Asignado</p>
            <div className={`flex items-center gap-2 text-2xl font-black ${isBalanced ? 'text-green-600' : 'text-amber-500'}`}>
              {totalAssigned}
              {isBalanced ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            </div>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase border-b">
                <th className="pb-2">{manageBy === 'B' ? 'Número de Lote' : 'Número de Serie'}</th>
                <th className="pb-2 w-32 text-center">Cantidad</th>
                {manageBy === 'B' && <th className="pb-2 w-48">F. Caducidad</th>}
                <th className="pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {details.map((d, idx) => (
                <tr key={idx} className="group">
                  <td className="py-2 pr-2">
                    {isSale && !readOnly ? (
                      <select 
                        value={d.batchNum} 
                        onChange={e => updateLine(idx, 'batchNum', e.target.value)}
                        className="w-full h-9 border border-slate-200 rounded-lg text-sm bg-slate-50 font-bold"
                      >
                        <option value="">Seleccionar lote...</option>
                        {availableBatches.filter(ab => Number(ab.quantity) > 0).map(ab => (
                          <option key={ab.batchNum} value={ab.batchNum}>
                            {ab.batchNum} (Disp: {ab.quantity})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input 
                        placeholder={manageBy === 'B' ? "Lote..." : "Serie..."} 
                        value={d.batchNum} 
                        onChange={e => updateLine(idx, 'batchNum', e.target.value)}
                        disabled={readOnly}
                        className={cn("h-9 border-slate-200", readOnly ? "bg-white border-transparent font-bold text-slate-700" : "focus:border-blue-500")}
                      />
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <Input 
                      type="number" 
                      value={d.quantity} 
                      onChange={e => updateLine(idx, 'quantity', Number(e.target.value))}
                      disabled={manageBy === 'S' || readOnly}
                      className={cn("h-9 text-center border-slate-200", readOnly && "bg-white border-transparent font-bold text-slate-700")}
                    />
                  </td>
                  {manageBy === 'B' && (
                    <td className="py-2 px-2">
                    <Input 
                        type="date" 
                        value={d.expiryDate || ''} 
                        onChange={e => updateLine(idx, 'expiryDate', e.target.value)}
                        disabled={readOnly}
                        className={cn("h-9 border-slate-200", readOnly && "bg-white border-transparent font-bold text-slate-700")}
                      />
                    </td>
                  )}
                  <td className="py-2 text-right">
                    {!readOnly && (
                      <button onClick={() => removeLine(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {!readOnly && (
            <Button variant="secondary" onClick={addLine} size="sm" className="mt-4 w-full border-dashed border-2 hover:border-blue-400 hover:bg-blue-50">
              <Plus size={14} className="mr-2"/> Añadir {manageBy === 'B' ? 'otro Lote' : 'otra Serie'}
            </Button>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          {readOnly ? (
            <Button onClick={onClose} className="px-10">Cerrar</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleConfirm} disabled={!isBalanced || details.some(d => !d.batchNum)}>
                Confirmar Asignación
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
