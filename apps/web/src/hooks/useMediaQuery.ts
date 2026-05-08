import { useEffect, useState } from 'react';

/**
 * Devuelve `true` si la media query dada matchea actualmente en la ventana.
 * Reactivo: se actualiza al redimensionar / cambiar orientación.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** < 768px — límite Tailwind `md`. */
export const useIsMobile = (): boolean => !useMediaQuery('(min-width: 768px)');
