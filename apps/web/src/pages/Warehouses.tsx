import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Loader, useToast, Modal } from '@openfactu/ui';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Plus, Trash2, LayoutGrid, Globe, ArrowRight, Settings2 } from 'lucide-react';
import { BinGeneratorModal } from '../components/BinGeneratorModal';

export const Warehouses: React.FC = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const canWrite =
    user?.role === 'SUPERUSER' ||
    user?.role === 'ADMIN' ||
    user?.permissions?.[location.pathname]?.write;
  const canDelete =
    user?.role === 'SUPERUSER' ||
    user?.role === 'ADMIN' ||
    user?.permissions?.[location.pathname]?.delete;
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any | null>(null);
  const [bins, setBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBins, setLoadingBins] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [name, setName] = useState('');
  const [whLocation, setWhLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/warehouses', {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' },
      });
      const data = await res.json();
      setWarehouses(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBins = async (whId: string) => {
    setLoadingBins(true);
    try {
      const res = await fetch(`/api/zones?warehouseId=${whId}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' },
      });
      const data = await res.json();
      setBins(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBins(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId) {
      setSelectedWarehouse(null);
      setBins([]);
      fetchWarehouses();
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchBins(selectedWarehouse.id);
    }
  }, [selectedWarehouse]);

  const handleSubmitWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || '',
        },
        body: JSON.stringify({ name, location: whLocation }),
      });
      if (res.ok) {
        setName('');
        setWhLocation('');
        fetchWarehouses();
        toast.success('Almacén creado correctamente');
      }
    } catch (err) {
      toast.error('Error al crear almacén');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteBin = async (id: string) => {
    try {
      const res = await fetch(`/api/zones/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' },
      });
      if (res.ok) {
        fetchBins(selectedWarehouse.id);
        toast.success('Ubicación eliminada');
      }
    } catch (err) {
      toast.error('Error');
    }
  };

  const warehouseColumns = [
    {
      header: 'Centro Logístico',
      accessor: (w: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 dark:text-slate-100">{w.name}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
            {w.location || 'Sin Ubicación'}
          </span>
        </div>
      ),
    },
    {
      header: 'Predet.',
      accessor: (w: any) => w.isDefault && <div className="w-2 h-2 rounded-full bg-emerald-500" />,
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      accessor: (w: any) => (
        <Button
          variant={selectedWarehouse?.id === w.id ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedWarehouse(w)}
        >
          <ArrowRight size={14} />
        </Button>
      ),
    },
  ];

  const binColumns = [
    {
      header: 'Ubicación / Bin',
      accessor: (b: any) => (
        <div className="flex items-center gap-3">
          <div className="p-1 px-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 font-mono font-black text-xs rounded border border-blue-100 dark:border-blue-500/20 uppercase tracking-wider">
            {b.name}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium italic">
            {b.description}
          </span>
        </div>
      ),
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      accessor: (b: any) => (
        <button
          onClick={() => canDelete && deleteBin(b.id)}
          disabled={!canDelete}
          className={`p-2 transition-all rounded-lg ${canDelete ? 'text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10' : 'text-slate-100 cursor-not-allowed grayscale'}`}
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tighter font-display">
            <Globe className="text-blue-600 dark:text-blue-300" size={32} />
            Logistics Command Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">
            Gestión industrial de almacenes y mallas de ubicación.
          </p>
        </div>
      </header>

      <div className="space-y-8">
        {/* Panel Superior: Maestros de Almacén */}
        <div>
          <Card
            title="Centros Activos"
            noPadding
            headerAction={
              <Button
                size="sm"
                onClick={() => setShowWarehouseModal(true)}
                disabled={!canWrite}
                className="flex items-center gap-2 disabled:opacity-50 disabled:grayscale transition-all"
              >
                <Plus size={14} /> Nuevo
              </Button>
            }
          >
            <Table columns={warehouseColumns} data={warehouses} isLoading={loading} />
          </Card>
        </div>

        {/* Panel Inferior: Gestión de Bins / Ubicaciones */}
        <div>
          {selectedWarehouse ? (
            <div className="space-y-6">
              <header className="flex items-center justify-between p-6 bg-slate-900 rounded-2xl text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-xl shadow-inner">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">{selectedWarehouse.name}</h2>
                    <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">
                      {selectedWarehouse.location || 'BODEGA ESTÁNDAR'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowGenerator(true)}
                    disabled={!canWrite}
                    className="flex items-center gap-2 bg-white dark:bg-slate-900/10 hover:bg-white dark:hover:bg-slate-900/20 border-white/10 disabled:opacity-30 disabled:grayscale"
                  >
                    <LayoutGrid size={16} />
                    Generar Bins (Alta Densidad)
                  </Button>
                </div>
              </header>

              <Card
                noPadding
                title="Malla de Ubicaciones"
                subtitle={`Total: ${bins.length} ubicaciones asignadas a este centro.`}
                bodyClassName="min-h-[400px]"
              >
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  <Table
                    columns={binColumns}
                    data={bins}
                    isLoading={loadingBins}
                    emptyMessage="Este almacén no tiene ubicaciones generadas."
                  />
                </div>
              </Card>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">
              <Globe size={64} className="mb-6 opacity-10" />
              <p className="font-black text-sm uppercase tracking-widest">
                Selecciona un Almacén para gestionar su logística
              </p>
            </div>
          )}
        </div>
      </div>

      {showGenerator && selectedWarehouse && (
        <BinGeneratorModal
          warehouseId={selectedWarehouse.id}
          onClose={() => setShowGenerator(false)}
          onSuccess={() => {
            setShowGenerator(false);
            fetchBins(selectedWarehouse.id);
          }}
        />
      )}

      <Modal
        isOpen={showWarehouseModal}
        onClose={() => setShowWarehouseModal(false)}
        title="Nuevo Almacén"
        subtitle="Define un nuevo centro de distribución."
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            await handleSubmitWarehouse(e);
            if (name === '') setShowWarehouseModal(false); // only close on success
          }}
          className="space-y-6 pt-4"
        >
          <Input
            label="Nombre Corto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ej: ALM-CEN"
          />
          <Input
            label="Ubicación Geográfica"
            value={whLocation}
            onChange={(e) => setWhLocation(e.target.value)}
            placeholder="Ej: Planta 2, Sector Sur"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowWarehouseModal(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader size="sm" variant="white" /> : 'Crear Almacén'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
