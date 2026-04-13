# @openfactu/plugin-sdk

SDK oficial para el desarrollo de plugins en la plataforma **OpenFactu ERP**.

Este paquete proporciona las definiciones de tipos, interfaces y herramientas necesarias para extender las capacidades de OpenFactu mediante plugins desacoplados.

## 🚀 Instalación

Para comenzar a desarrollar tu plugin, instala el SDK en tu proyecto:

```bash
npm install @openfactu/plugin-sdk --save-dev
```

## 🛠️ Uso

### 1. Definir el Manifiesto

Crea un archivo `manifest.json` en la raíz de tu plugin:

```json
{
  "id": "mi-plugin-personalizado",
  "name": "Mi Super Plugin",
  "version": "1.0.0",
  "ui": {
    "routes": [
      {
        "path": "/mi-ruta",
        "title": "Mi Vista",
        "type": "custom",
        "config": {
          "component": "ui/MiComponente.tsx"
        }
      }
    ]
  }
}
```

### 2. Crear Componentes UI

Puedes usar React y `@openfactu/ui` (proporcionados por el ERP en ejecución):

```tsx
import React from 'react';
import { Button, Card } from '@openfactu/ui';
import { Zap } from 'lucide-react';

export const MiComponente = () => {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Zap className="text-blue-500" />
        Hola desde mi Plugin
      </h2>
      <Button className="mt-4">Click de Prueba</Button>
    </Card>
  );
};

export default MiComponente;
```

## 📜 Licencia

Propietario - OpenFactu ERP.
