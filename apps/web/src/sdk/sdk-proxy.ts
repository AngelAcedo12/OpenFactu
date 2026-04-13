import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import * as Lucide from 'lucide-react';
import * as UI from '@openfactu/ui';
import * as Router from 'react-router-dom';

/**
 * Exponemos las librerías al objeto global window para que los 
 * plugins cargados dinámicamente puedan acceder a ellas sin redundancia.
 */
export const initializeSDK = () => {
    (window as any).React = React;
    (window as any).ReactDOM = ReactDOM;
    (window as any).Lucide = Lucide;
    (window as any).OpenFactuUI = UI;
    (window as any).ReactRouterDOM = Router;

    console.log('[SDK] Infraestructura compartida inicializada en window.');
};
