import React, { useEffect, useState } from 'react';
import { useGeo, type GeoRow } from '../../hooks/useGeo';

interface Props {
  countryCode: string;
  regionId?: string | null;
  value: string;
  onChange: (subRegionId: string) => void;
  label?: string;
  disabled?: boolean;
}

export const SubRegionSelect: React.FC<Props> = ({
  countryCode,
  regionId,
  value,
  onChange,
  label,
  disabled,
}) => {
  const { loadSubRegionsByCountry, loadSubRegionsByRegion, getCountry } = useGeo();
  const [rows, setRows] = useState<GeoRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode) {
      setRows([]);
      return;
    }
    setLoading(true);
    const promise = regionId
      ? loadSubRegionsByRegion(regionId)
      : loadSubRegionsByCountry(countryCode);
    promise
      .then((data) => {
        // Si estamos filtrando por region cuyo valor todavía no cambió pero countryCode sí,
        // descartar resultados que no coincidan con el país.
        setRows(data.filter((r) => !countryCode || r.countryCode === countryCode.toUpperCase()));
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [countryCode, regionId, loadSubRegionsByCountry, loadSubRegionsByRegion]);

  const country = getCountry(countryCode);
  if (!countryCode) return null;

  return (
    <div>
      <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
        {label || country?.subRegionLabel || 'Provincia'}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading || rows.length === 0}
        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
      >
        <option value="">
          — {loading ? 'Cargando...' : country?.subRegionLabel || 'Provincia'} —
        </option>
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    </div>
  );
};
