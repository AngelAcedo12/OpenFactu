import React, { useEffect, useState } from 'react';
import { useGeo, GeoRow } from '../../hooks/useGeo';

interface Props {
  countryCode: string;
  value: string;
  onChange: (regionId: string) => void;
  label?: string;
  disabled?: boolean;
}

export const RegionSelect: React.FC<Props> = ({ countryCode, value, onChange, label, disabled }) => {
  const { loadRegions, getCountry } = useGeo();
  const [regions, setRegions] = useState<GeoRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode) { setRegions([]); return; }
    setLoading(true);
    loadRegions(countryCode)
      .then(setRegions)
      .catch(() => setRegions([]))
      .finally(() => setLoading(false));
  }, [countryCode, loadRegions]);

  const country = getCountry(countryCode);
  if (!country?.regionLabel) return null;      // país sin nivel de regiones (PT/GB/US)
  if (!countryCode) return null;

  return (
    <div>
      {label && <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">{label || country.regionLabel}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
      >
        <option value="">— {loading ? 'Cargando...' : country.regionLabel} —</option>
        {regions.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
    </div>
  );
};
