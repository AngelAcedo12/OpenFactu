import { useState, useEffect, useCallback } from 'react';

export interface DocumentLine {
  id?: string;
  itemId: string;
  quantity: number;
  price: number;
  warehouseId: string;
  batchNum?: string;
  lineNum?: number;
  baseLine?: number;
  lineTotal?: number;
  [key: string]: any;
}

export interface UseDocumentProps {
  token: string;
  tenantId: string;
  docType: 'PO' | 'PDN' | 'PINV' | 'SO' | 'SDN' | 'SINV';
  apiEndpoint: string;
  permissions?: { read: boolean; write: boolean; delete: boolean };
}

export function useDocument({ token, tenantId, docType, apiEndpoint, permissions }: UseDocumentProps) {
  const [partnerId, setPartnerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Masters
  const [partners, setPartners] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [taxGroups, setTaxGroups] = useState<any[]>([]);
  const [mappedPrices, setMappedPrices] = useState<Record<string, number>>({});
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [mastersError, setMastersError] = useState<string | null>(null);

  const headers = { 
    'Authorization': `Bearer ${token}`, 
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json'
  };

  const fetchMasters = useCallback(async () => {
    try {
      const [sRes, pRes, bpRes, iRes, wRes, tRes] = await Promise.all([
        fetch('/api/series', { headers }),
        fetch('/api/periods', { headers }),
        fetch('/api/partners', { headers }),
        fetch('/api/items', { headers }),
        fetch('/api/warehouses', { headers }),
        fetch('/api/taxes', { headers })
      ]);

      const [sData, pData, bpData, iData, wData, tData] = await Promise.all([
        sRes.json(), pRes.json(), bpRes.json(), iRes.json(), wRes.json(), tRes.json()
      ]);

      const sList = (Array.isArray(sData) ? sData : []).filter((x: any) => {
        if (docType === 'PO') return x.docType === 'PO';
        if (docType === 'PDN') return x.docType === 'PDN';
        if (docType === 'PINV') return x.docType === 'PINV' 
        if (docType === 'SO') return x.docType === 'SO';
        if (docType === 'SDN') return x.docType === 'SDN';
        if (docType === 'SINV') return x.docType === 'SINV'
        return x.docType === docType;
      });
      const pList = Array.isArray(pData) ? pData : [];

      setSeries(sList);
      setPeriods(pList);
      setPartners(Array.isArray(bpData) ? bpData : []);
      setItems(Array.isArray(iData) ? iData : []);
      setTaxGroups(Array.isArray(tData) ? tData : []);
      const wList = Array.isArray(wData) ? wData : [];
      setWarehouses(wList);

      // Proactive validation of series for the CURRENT context
      const filteredSeries = (Array.isArray(sData) ? sData : []).filter((s:any) => s.docType === docType);
      if (filteredSeries.length === 0) {
        setSeriesError(`No hay series de numeración configuradas para: ${docType}`);
      } else {
        setSeriesError(null);
      }

      // Default selection logic
      const today = new Date();
      const activePeriod = pList.find((p: any) => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return p.status === 'O' && today >= start && today <= end;
      }) || pList.find((p: any) => p.status === 'O');

      if (activePeriod) {
        setPeriodId(activePeriod.id);
        const defaultSeries = sList.find((s: any) => s.periodId === activePeriod.id && s.docType === docType) || 
                              sList.find((s: any) => s.periodId === activePeriod.id) || 
                              sList[0];
        if (defaultSeries) setSeriesId(defaultSeries.id);
      }

      const defW = wList.find((x: any) => x.isDefault);
      if (defW) setWarehouseId(defW.id);

    } catch (e: any) {
      console.error('Error fetching masters:', e);
      setMastersError(e.message || 'Error al cargar datos maestros');
    } finally {
      setMastersLoading(false);
    }
  }, [docType, token, tenantId]);

  useEffect(() => {
    if (tenantId) {
      setMastersError(null);
      fetchMasters();
    } else {
      setMastersError('Empresa no asignada. Contacte con un administrador.');
    }
  }, [tenantId, fetchMasters]);

  // Pricing Logic
  useEffect(() => {
    const fetchPartnerPrices = async () => {
      const partner = partners.find(p => p.id === partnerId);
      if (partner?.priceListId) {
        try {
          const res = await fetch(`/api/pricelists/${partner.priceListId}/prices`, { headers });
          const data = await res.json();
          const pMap: Record<string, number> = {};
          if (Array.isArray(data)) {
            data.forEach((p: any) => { pMap[p.itemId] = Number(p.price); });
          }
          setMappedPrices(pMap);
        } catch {
          setMappedPrices({});
        }
      } else {
        setMappedPrices({});
      }
    };
    if (partnerId) fetchPartnerPrices();
  }, [partnerId, partners, token, tenantId]);

  const addLine = (defaults: any = {}) => {
    // Evitar que el objeto Event pase como defaults si se usa onClick={addLine}
    const cleanDefaults = (defaults && typeof defaults === 'object' && 'nativeEvent' in defaults) ? {} : defaults;

    setLines([...lines, { 
      itemId: '', 
      quantity: 1, 
      price: 0, 
      taxGroupId: '',
      warehouseId: warehouseId || '', 
      lineNum: lines.length + 1,
      ...cleanDefaults 
    }]);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    
    let castedValue = value;
    if (field === 'quantity' || field === 'price') {
      const stringValue = String(value || '0').replace(',', '.');
      castedValue = parseFloat(stringValue) || 0;
    }
    
    newLines[index] = { ...newLines[index], [field]: castedValue };

    if (field === 'itemId') {
      const selectedItem = items.find(i => i.id === value);
      if (selectedItem) {
        newLines[index].price = mappedPrices[value] || Number(selectedItem.basePrice) || 0;
        newLines[index].taxGroupId = selectedItem.taxGroupId || '';
      }
    }
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const subtotal = lines.reduce((acc, curr) => acc + (Number(curr.quantity || 0) * Number(curr.price || 0)), 0);
  
  const taxTotal = lines.reduce((acc, curr) => {
    const lineSubtotal = Number(curr.quantity || 0) * Number(curr.price || 0);
    const taxGroup = taxGroups.find(t => t.id === curr.taxGroupId);
    const rate = taxGroup ? Number(taxGroup.rate) : 0;
    return acc + (lineSubtotal * (rate / 100));
  }, 0);

  const total = subtotal + taxTotal;

  const canRead = permissions?.read ?? true;
  const canWrite = permissions?.write ?? true;
  const canDelete = permissions?.delete ?? true;

  const [pluginData, setPluginData] = useState<Record<string, any>>({});

  const setPluginField = (fieldName: string, value: any) => {
    setPluginData(prev => ({ ...prev, [fieldName]: value }));
  };

  // ... (headers etc) ...

  const submitDocument = async (extraBody: any = {}) => {
    if (!canWrite) throw new Error('No tienes permisos suficientes para realizar esta acción (Escritura denegada).');
    if (!seriesId) throw new Error('Debes seleccionar una serie de numeración operativa.');
    if (!periodId) throw new Error('Debes seleccionar un periodo contable válido.');
    if (lines.length === 0) throw new Error('El documento no tiene líneas.');
    
    // Batches validation
    for (const [idx, line] of lines.entries()) {
      const item = items.find(i => i.id === line.itemId);
      if (item && item.manageBy !== 'N' && docType !== 'PO' && docType !== 'SO') {
        const totalBatched = (line.batchDetails || []).reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0);
        if (totalBatched < Number(line.quantity)) {
          throw new Error(`Línea ${idx + 1}: Faltan lotes/trazabilidad por asignar (${Number(line.quantity) - totalBatched} pendientes).`);
        }
      }
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          seriesId, periodId, partnerId, date, warehouseId,
          lines, 
          ...pluginData,
          ...extraBody
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar el documento');
      }
      
      return await res.json();
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    state: { partnerId, warehouseId, seriesId, periodId, date, lines, isSubmitting, seriesError, mastersLoading, mastersError, canRead, canWrite, canDelete, pluginData },
    setState: { setPartnerId, setWarehouseId, setSeriesId, setPeriodId, setDate, setLines, setPluginField, setPluginData },
    masters: { partners, items, warehouses, series, periods, taxGroups },
    actions: { addLine, updateLine, removeLine, submitDocument },
    computations: { subtotal, taxTotal, total }
  };
}
