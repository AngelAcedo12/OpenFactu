import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { validatePostalCode } from '@openfactu/common';
import { useGeo } from '../../hooks/useGeo';

interface Props {
  countryCode: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
}

export const PostalCodeInput: React.FC<Props> = ({ countryCode, value, onChange, disabled, label }) => {
  const { getCountry } = useGeo();
  const country = getCountry(countryCode);
  const [touched, setTouched] = useState(false);
  const valid = value ? validatePostalCode(value, country || undefined) : true;
  const showError = touched && !!value && !valid;

  return (
    <div>
      <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
        {label || country?.postalCodeLabel || 'Código postal'}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-9 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm ${
            showError ? 'border-rose-500 dark:border-rose-500/50' : 'border-slate-200 dark:border-slate-700'
          }`}
        />
        {touched && value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {valid
              ? <Check size={14} className="text-emerald-500" />
              : <X size={14} className="text-rose-500" />}
          </div>
        )}
      </div>
      {showError && (
        <p className="text-[10px] text-rose-500 mt-1">Formato inválido.</p>
      )}
    </div>
  );
};
