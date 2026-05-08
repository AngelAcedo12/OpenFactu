import { useEffect } from 'react';
import { useScanner, type ScanHandler } from '../context/ScannerContext';

interface Options {
  enabled?: boolean;
}

/**
 * Registra un handler de escaneo mientras el componente está montado.
 * Recibe cualquier código leído vía escáner HID **o** cámara.
 *
 * Uso:
 * ```
 * useBarcodeScanner((code) => setSearch(code));
 * ```
 */
export function useBarcodeScanner(handler: ScanHandler, options: Options = {}) {
  const { subscribe } = useScanner();
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;
    return subscribe(handler);
  }, [subscribe, handler, enabled]);
}
