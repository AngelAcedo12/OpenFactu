import { useState } from 'react';

/**
 * Hook personalizado dentro de un plugin.
 * Demuestra que podemos compartir lógica reactiva.
 */
export const useCounter = (initialValue = 0) => {
  const [count, setCount] = useState(initialValue);
  
  const increment = () => {
    console.log('[Plugin Layer] Incrementando estado local...');
    setCount(prev => prev + 1);
  };
  
  const decrement = () => {
    console.log('[Plugin Layer] Decrementando estado local...');
    setCount(prev => prev - 1);
  };
  
  return { count, increment, decrement };
};
