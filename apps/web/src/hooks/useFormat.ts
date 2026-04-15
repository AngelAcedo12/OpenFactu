import { useMemo } from 'react';
import { formatCurrency, formatDate, formatNumber, formatQuantity } from '@openfactu/common';
import { useTheme } from '../context/ThemeContext';

/**
 * Devuelve formatters enlazados al locale/precisión configurados en la empresa activa.
 */
export function useFormat() {
  const { format } = useTheme();

  return useMemo(
    () => ({
      money: (value: number | string | null | undefined, currency?: string) =>
        formatCurrency(value, format, currency),
      number: (value: number | string | null | undefined, precision?: number) =>
        formatNumber(value, format, precision),
      quantity: (value: number | string | null | undefined) => formatQuantity(value, format),
      date: (value: Date | string | null | undefined) => formatDate(value, format),
    }),
    [format],
  );
}
