/**
 * Contador in-memory de peticiones HTTP. Alimenta el cockpit con un resumen
 * de tráfico y tasa de errores sin necesidad de APM externo.
 *
 * Se engancha como middleware Express *antes* de las rutas. Cada request
 * increments `total`; al terminar la respuesta, si el statusCode >= 500
 * cuenta como error. También registra un histograma ligero por clase de
 * status (2xx, 3xx, 4xx, 5xx) y por método.
 */

import type { Request, Response, NextFunction } from 'express';

interface Counters {
  total: number;
  errors: number;
  byStatusClass: { '2xx': number; '3xx': number; '4xx': number; '5xx': number };
  byMethod: Record<string, number>;
  startedAt: number;
  lastReset: number;
}

const counters: Counters = {
  total: 0,
  errors: 0,
  byStatusClass: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
  byMethod: {},
  startedAt: Date.now(),
  lastReset: Date.now(),
};

export function requestCounterMiddleware(req: Request, res: Response, next: NextFunction) {
  counters.total++;
  counters.byMethod[req.method] = (counters.byMethod[req.method] || 0) + 1;
  res.on('finish', () => {
    const code = res.statusCode;
    if (code >= 500) counters.errors++;
    if (code >= 200 && code < 300) counters.byStatusClass['2xx']++;
    else if (code >= 300 && code < 400) counters.byStatusClass['3xx']++;
    else if (code >= 400 && code < 500) counters.byStatusClass['4xx']++;
    else if (code >= 500) counters.byStatusClass['5xx']++;
  });
  next();
}

export interface RequestStats {
  total: number;
  errors: number;
  errorRatePct: number;
  avgPerSec: number;
  byStatusClass: Counters['byStatusClass'];
  byMethod: Record<string, number>;
  uptimeSec: number;
}

export function getRequestStats(): RequestStats {
  const uptimeSec = (Date.now() - counters.startedAt) / 1000;
  return {
    total: counters.total,
    errors: counters.errors,
    errorRatePct: counters.total > 0 ? (counters.errors * 100) / counters.total : 0,
    avgPerSec: uptimeSec > 0 ? counters.total / uptimeSec : 0,
    byStatusClass: { ...counters.byStatusClass },
    byMethod: { ...counters.byMethod },
    uptimeSec,
  };
}
