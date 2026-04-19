/**
 * Panel flotante de utilidades de desarrollo. Solo se renderiza si:
 *   1. El servidor está en modo debug (`/api/setup/status` devuelve `debugEnabled: true`).
 *   2. O el usuario añade `?debug=1` a la URL.
 *
 * Acciones:
 *   - Reset setup: vacía tenants + config y vuelve al wizard.
 *   - Forzar setup: redirige con `?force=1` para mostrar el wizard sin tirar nada.
 *   - Re-seed geo: re-ejecuta seedGeo (países).
 *
 * No se muestra en producción salvo que se active explícitamente, para no
 * exponer botones destructivos a usuarios finales.
 */

import React, { useEffect, useState } from 'react';
import { Bug, RotateCcw, Globe, AlertTriangle, X } from 'lucide-react';

export const DebugPanel: React.FC = () => {
  const [debugEnabled, setDebugEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const forceParam = new URLSearchParams(window.location.search).get('debug') === '1';
    fetch('/api/setup/status')
      .then((r) => r.json())
      .then((j) => setDebugEnabled(Boolean(j?.debugEnabled) || forceParam))
      .catch(() => setDebugEnabled(forceParam));
  }, []);

  if (!debugEnabled) return null;

  const call = async (label: string, action: () => Promise<Response>) => {
    setBusy(label);
    setMsg(null);
    setErr(null);
    try {
      const r = await action();
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || `HTTP ${r.status}`);
      setMsg(body?.message || JSON.stringify(body));
    } catch (e: any) {
      setErr(e?.message || 'Error');
    } finally {
      setBusy(null);
    }
  };

  const resetSetup = () =>
    call('reset', () =>
      fetch('/api/setup/dev-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

  const reseedGeo = () =>
    call('geo', () =>
      fetch('/api/geo/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

  const forceWizard = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('force', '1');
    url.pathname = '/';
    window.location.href = url.toString();
  };

  return (
    <div className="fixed bottom-4 right-4 z-[99999] font-sans">
      {open ? (
        <div className="w-80 rounded-xl shadow-2xl bg-amber-50 dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-amber-200/60 dark:bg-amber-900/60 border-b border-amber-300 dark:border-amber-700">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-xs font-bold uppercase tracking-wider">
              <Bug size={14} />
              Debug Setup
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-amber-700 dark:text-amber-300 hover:bg-amber-300/40 dark:hover:bg-amber-800/40 rounded p-1"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-3 space-y-2 text-xs text-amber-900 dark:text-amber-100">
            <div className="flex items-start gap-2 text-[10px] leading-snug">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>
                Acciones destructivas — solo úsalas en desarrollo. Pondrán la
                app en estado inicial.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    '¿Resetear setup completamente?\n\nVa a borrar:\n- Todos los tenants y sus schemas\n- Todos los usuarios globales\n- El archivo de configuración\n\nLos países (Country/Region/...) se conservan.',
                  )
                ) {
                  resetSetup();
                }
              }}
              disabled={!!busy}
              className="w-full flex items-center gap-2 px-3 py-2 rounded bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold"
            >
              <RotateCcw size={13} />
              {busy === 'reset' ? 'Reseteando…' : 'Reset setup completo'}
            </button>
            <button
              type="button"
              onClick={forceWizard}
              disabled={!!busy}
              className="w-full flex items-center gap-2 px-3 py-2 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold"
            >
              <Bug size={13} />
              Forzar wizard (?force=1)
            </button>
            <button
              type="button"
              onClick={reseedGeo}
              disabled={!!busy}
              className="w-full flex items-center gap-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
            >
              <Globe size={13} />
              {busy === 'geo' ? 'Sembrando…' : 'Re-cargar países / geografía'}
            </button>
            {msg && (
              <div className="px-2 py-1.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-[10px] break-words">
                ✓ {msg}
              </div>
            )}
            {err && (
              <div className="px-2 py-1.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-[10px] break-words">
                ⚠ {err}
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Panel de debug del setup"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider border-2 border-amber-300"
        >
          <Bug size={14} />
          Debug
        </button>
      )}
    </div>
  );
};
