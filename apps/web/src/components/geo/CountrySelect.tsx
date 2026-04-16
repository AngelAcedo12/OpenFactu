import React from 'react';
import { useGeo } from '../../hooks/useGeo';

const FLAGS: Record<string, string> = {
  ES: '🇪🇸',
  PT: '🇵🇹',
  FR: '🇫🇷',
  IT: '🇮🇹',
  DE: '🇩🇪',
  GB: '🇬🇧',
  US: '🇺🇸',
};

interface Props {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
}

export const CountrySelect: React.FC<Props> = ({ value, onChange, disabled, className }) => {
  const { countries } = useGeo();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={
        className ||
        'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm'
      }
    >
      <option value="">— Seleccionar país —</option>
      {countries.map((c) => (
        <option key={c.code} value={c.code}>
          {FLAGS[c.code] || ''} {c.name}
        </option>
      ))}
    </select>
  );
};
