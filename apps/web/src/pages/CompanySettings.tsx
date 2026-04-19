import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Loader, useToast } from '@openfactu/ui';
import {
  Building,
  Save,
  Palette,
  Globe,
  SlidersHorizontal,
  FileText,
  HardDrive,
  FileBox,
  Upload,
  Mail,
} from 'lucide-react';
import { StorageSettingsTab } from '../components/settings/StorageSettingsTab';
import { DataTransferTab } from '../components/settings/DataTransferTab';
import { EmailSettingsTab } from '../components/settings/EmailSettingsTab';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate } from '@openfactu/common';
import { CountrySelect } from '../components/geo/CountrySelect';
import { RegionSelect } from '../components/geo/RegionSelect';
import { SubRegionSelect } from '../components/geo/SubRegionSelect';
import { LocalitySelect } from '../components/geo/LocalitySelect';
import { TaxIdInput } from '../components/geo/TaxIdInput';
import { PostalCodeInput } from '../components/geo/PostalCodeInput';
import { PhoneInput } from '../components/geo/PhoneInput';

interface CompanyConfig {
  name: string;
  taxId: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  regionId: string;
  subRegionId: string;
  localityId: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string;
  currency: string;
  fiscalYearStart: string;
}

const EMPTY: CompanyConfig = {
  name: '',
  taxId: '',
  address: '',
  city: '',
  zipCode: '',
  country: 'ES',
  regionId: '',
  subRegionId: '',
  localityId: '',
  email: '',
  phone: '',
  website: '',
  logoUrl: '',
  currency: 'EUR',
  fiscalYearStart: '01-01',
};

type TabId =
  | 'fiscal'
  | 'branding'
  | 'format'
  | 'flags'
  | 'storage'
  | 'templates'
  | 'data'
  | 'email';

export const CompanySettings: React.FC = () => {
  const { token, user } = useAuth();
  const { branding, format, flags, update: updateTheme, reload: reloadTheme } = useTheme();
  const toast = useToast();
  // Soporta deep-link al tab vía `?tab=storage|data|templates|...`. Usado por el
  // sidebar (Configuración → Almacenamiento / Importar/Exportar).
  const initialTab: TabId = (() => {
    if (typeof window === 'undefined') return 'fiscal';
    const t = new URLSearchParams(window.location.search).get('tab');
    const allowed: TabId[] = [
      'fiscal',
      'branding',
      'format',
      'flags',
      'storage',
      'templates',
      'data',
      'email',
    ];
    return allowed.includes(t as TabId) ? (t as TabId) : 'fiscal';
  })();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [fiscal, setFiscal] = useState<CompanyConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local drafts for branding/format/flags so the user can edit before saving
  const [brandingDraft, setBrandingDraft] = useState(branding);
  const [formatDraft, setFormatDraft] = useState(format);
  const [flagsDraft, setFlagsDraft] = useState(flags);

  useEffect(() => setBrandingDraft(branding), [branding]);
  useEffect(() => setFormatDraft(format), [format]);
  useEffect(() => setFlagsDraft(flags), [flags]);

  const fetchFiscal = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company', {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' },
      });
      if (!res.ok) throw new Error('http');
      const cfg = await res.json();
      setFiscal({ ...EMPTY, ...cfg });
    } catch {
      toast.error('Error al cargar la configuración de empresa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId) fetchFiscal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenantId]);

  const saveFiscal = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': user?.tenantId || '',
        },
        body: JSON.stringify(fiscal),
      });
      if (!res.ok) throw new Error('http');
      const updated = await res.json();
      setFiscal({ ...EMPTY, ...updated });
      toast.success('Datos de empresa guardados');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      await updateTheme('branding', brandingDraft);
      toast.success('Branding guardado');
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveFormat = async () => {
    setSaving(true);
    try {
      await updateTheme('format', formatDraft);
      toast.success('Formato guardado');
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveFlags = async () => {
    setSaving(true);
    try {
      await updateTheme('flags', flagsDraft);
      toast.success('Comportamiento guardado');
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const setF = <K extends keyof CompanyConfig>(k: K, v: CompanyConfig[K]) =>
    setFiscal((prev) => ({ ...prev, [k]: v }));

  if (loading)
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader />
      </div>
    );

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'fiscal', label: 'Datos fiscales', icon: FileText },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'format', label: 'Formato', icon: Globe },
    { id: 'flags', label: 'Comportamiento', icon: SlidersHorizontal },
    { id: 'templates', label: 'Plantillas', icon: FileBox },
    { id: 'storage', label: 'Almacenamiento', icon: HardDrive },
    { id: 'email', label: 'Correo', icon: Mail },
    { id: 'data', label: 'Importar/Exportar', icon: Upload },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          <Building size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Configuración de Empresa
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Datos fiscales, branding, formato y comportamiento.
          </p>
        </div>
      </div>

      {/* Tabs — scroll horizontal cuando no caben, sin wrap */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                activeTab === t.id
                  ? 'text-primary border-primary'
                  : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'fiscal' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                País e identificación
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    País
                  </label>
                  <CountrySelect
                    value={fiscal.country}
                    onChange={(code) => {
                      setFiscal((prev) => ({
                        ...prev,
                        country: code,
                        regionId: '',
                        subRegionId: '',
                        localityId: '',
                        city: '',
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Nombre de la empresa
                  </label>
                  <Input value={fiscal.name} onChange={(e) => setF('name', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <TaxIdInput
                    countryCode={fiscal.country}
                    value={fiscal.taxId}
                    onChange={(v) => setF('taxId', v)}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Domicilio
              </h2>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                  Dirección
                </label>
                <Input value={fiscal.address} onChange={(e) => setF('address', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RegionSelect
                  countryCode={fiscal.country}
                  value={fiscal.regionId}
                  onChange={(id) =>
                    setFiscal((prev) => ({
                      ...prev,
                      regionId: id,
                      subRegionId: '',
                      localityId: '',
                      city: '',
                    }))
                  }
                />
                <SubRegionSelect
                  countryCode={fiscal.country}
                  regionId={fiscal.regionId || null}
                  value={fiscal.subRegionId}
                  onChange={(id) =>
                    setFiscal((prev) => ({ ...prev, subRegionId: id, localityId: '', city: '' }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LocalitySelect
                  subRegionId={fiscal.subRegionId}
                  value={fiscal.localityId}
                  valueName={fiscal.city}
                  onChange={(loc) =>
                    setFiscal((prev) => ({
                      ...prev,
                      localityId: loc?.id || '',
                      city: loc?.name || '',
                    }))
                  }
                />
                <PostalCodeInput
                  countryCode={fiscal.country}
                  value={fiscal.zipCode}
                  onChange={(v) => setF('zipCode', v)}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Contacto
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={fiscal.email}
                    onChange={(e) => setF('email', e.target.value)}
                  />
                </div>
                <PhoneInput
                  countryCode={fiscal.country}
                  value={fiscal.phone}
                  onChange={(v) => setF('phone', v)}
                />
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Web
                  </label>
                  <Input value={fiscal.website} onChange={(e) => setF('website', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    URL del logo (datos fiscales)
                  </label>
                  <Input value={fiscal.logoUrl} onChange={(e) => setF('logoUrl', e.target.value)} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Preferencias
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Moneda
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    value={fiscal.currency}
                    onChange={(e) => setF('currency', e.target.value)}
                  >
                    <option value="EUR">€ EUR</option>
                    <option value="USD">$ USD</option>
                    <option value="GBP">£ GBP</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Inicio del año fiscal (MM-DD)
                  </label>
                  <Input
                    value={fiscal.fiscalYearStart}
                    onChange={(e) => setF('fiscalYearStart', e.target.value)}
                    placeholder="01-01"
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveFiscal} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'branding' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Colores
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Color primario
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="h-9 w-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                      value={brandingDraft.colorPrimary}
                      onChange={(e) =>
                        setBrandingDraft({ ...brandingDraft, colorPrimary: e.target.value })
                      }
                    />
                    <Input
                      value={brandingDraft.colorPrimary}
                      onChange={(e) =>
                        setBrandingDraft({ ...brandingDraft, colorPrimary: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Color acento
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="h-9 w-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                      value={brandingDraft.colorAccent}
                      onChange={(e) =>
                        setBrandingDraft({ ...brandingDraft, colorAccent: e.target.value })
                      }
                    />
                    <Input
                      value={brandingDraft.colorAccent}
                      onChange={(e) =>
                        setBrandingDraft({ ...brandingDraft, colorAccent: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Marca
              </h2>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                  Nombre de la aplicación
                </label>
                <Input
                  value={brandingDraft.appName}
                  onChange={(e) => setBrandingDraft({ ...brandingDraft, appName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                  URL del logo
                </label>
                <Input
                  value={brandingDraft.logoUrl}
                  onChange={(e) => setBrandingDraft({ ...brandingDraft, logoUrl: e.target.value })}
                  placeholder="https://..."
                />
                {brandingDraft.logoUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Vista previa:
                    </span>
                    <img
                      src={brandingDraft.logoUrl}
                      alt="logo"
                      className="h-12 w-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Apariencia
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Familia tipográfica
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    value={brandingDraft.fontFamily}
                    onChange={(e) =>
                      setBrandingDraft({ ...brandingDraft, fontFamily: e.target.value as any })
                    }
                  >
                    <option value="sans">Sans-serif (Helvetica)</option>
                    <option value="serif">Serif (Georgia)</option>
                    <option value="mono">Monospace</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Modo
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    value={brandingDraft.themeMode}
                    onChange={(e) =>
                      setBrandingDraft({ ...brandingDraft, themeMode: e.target.value as any })
                    }
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Oscuro</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setBrandingDraft(branding)}
              disabled={saving}
            >
              Descartar
            </Button>
            <Button onClick={saveBranding} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? 'Guardando...' : 'Guardar branding'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'format' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Regionalización
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Locale
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    value={formatDraft.locale}
                    onChange={(e) => setFormatDraft({ ...formatDraft, locale: e.target.value })}
                  >
                    <option value="es-ES">Español (España)</option>
                    <option value="es-MX">Español (México)</option>
                    <option value="pt-PT">Português (Portugal)</option>
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-US">English (US)</option>
                    <option value="fr-FR">Français</option>
                    <option value="it-IT">Italiano</option>
                    <option value="de-DE">Deutsch</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Formato de fecha
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    value={formatDraft.dateFormat}
                    onChange={(e) => setFormatDraft({ ...formatDraft, dateFormat: e.target.value })}
                  >
                    <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                    <option value="dd-MM-yyyy">dd-MM-yyyy</option>
                    <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                    <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Decimales importes
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    value={formatDraft.decimalPrecision}
                    onChange={(e) =>
                      setFormatDraft({
                        ...formatDraft,
                        decimalPrecision: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Decimales cantidades
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    value={formatDraft.quantityPrecision}
                    onChange={(e) =>
                      setFormatDraft({
                        ...formatDraft,
                        quantityPrecision: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wide mb-2">
                  Vista previa
                </p>
                <div className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
                  <p>
                    <span className="text-slate-500 dark:text-slate-400">
                      Importe:
                    </span>{' '}
                    <span className="font-bold">
                      {formatCurrency(1234.56, formatDraft, fiscal.currency || 'EUR')}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-500 dark:text-slate-400">
                      Fecha:
                    </span>{' '}
                    <span className="font-bold">{formatDate(new Date(), formatDraft)}</span>
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormatDraft(format)} disabled={saving}>
              Descartar
            </Button>
            <Button onClick={saveFormat} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? 'Guardando...' : 'Guardar formato'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'flags' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6 space-y-1">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">
                Flags de comportamiento
              </h2>
              <FlagRow
                label="Permitir stock negativo"
                hint="Si está activo, los albaranes de venta pueden reducir el stock por debajo de cero."
                checked={flagsDraft.allowNegativeStock}
                onChange={(v) => setFlagsDraft({ ...flagsDraft, allowNegativeStock: v })}
              />
              <FlagRow
                label="Auto-confirmar lotes"
                hint="Al vender un artículo con lotes, el sistema asigna automáticamente FIFO si no se eligen manualmente."
                checked={flagsDraft.autoConfirmBatches}
                onChange={(v) => setFlagsDraft({ ...flagsDraft, autoConfirmBatches: v })}
              />
              <FlagRow
                label="Marca de agua BORRADOR en documentos abiertos"
                hint="Añade la marca BORRADOR a los PDFs de documentos en estado abierto."
                checked={flagsDraft.watermarkDraft}
                onChange={(v) => setFlagsDraft({ ...flagsDraft, watermarkDraft: v })}
              />
              <FlagRow
                label="Confirmar antes de cancelar"
                hint="Pide confirmación al usuario antes de cancelar un documento desde la interfaz."
                checked={flagsDraft.confirmBeforeCancel}
                onChange={(v) => setFlagsDraft({ ...flagsDraft, confirmBeforeCancel: v })}
              />
              <FlagRow
                label="Forzar zonas de almacén"
                hint="Exige especificar una zona (warehouseZone) en las líneas de documentos."
                checked={flagsDraft.enforceWarehouseZones}
                onChange={(v) => setFlagsDraft({ ...flagsDraft, enforceWarehouseZones: v })}
              />
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFlagsDraft(flags)} disabled={saving}>
              Descartar
            </Button>
            <Button onClick={saveFlags} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? 'Guardando...' : 'Guardar comportamiento'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <Card>
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <FileBox size={18} />
              <h2 className="text-lg font-bold">Plantillas PDF</h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Las plantillas de documento (facturas, albaranes, pedidos, etiquetas libres) se
              gestionan en una página dedicada con su diseñador visual.
            </p>
            <div>
              <a
                href="/document-templates"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
              >
                <FileBox size={14} />
                Abrir gestor de plantillas
              </a>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'storage' && <StorageSettingsTab />}

      {activeTab === 'email' && <EmailSettingsTab />}

      {activeTab === 'data' && <DataTransferTab />}
    </div>
  );
};

const FlagRow: React.FC<{
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, hint, checked, onChange }) => (
  <label className="flex items-start gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-4 w-4 accent-primary cursor-pointer"
    />
    <div className="flex-1">
      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  </label>
);
