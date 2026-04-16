import React, { useEffect, useState } from 'react';
import { Button, Card, Badge, Table, Toast, ToastProvider, useToast, Loader } from '@openfactu/ui';
import { Star, Plus, Minus, Zap, Puzzle } from 'lucide-react';
import { useCounter } from './useCounter';

/**
 * Componente principal del plugin de ejemplo.
 * Demuestra:
 * 1. Importación de React y Hooks (desde el SDK host).
 * 2. Importación de componentes UI oficiales (@openfactu/ui).
 * 3. Importación de iconos Lucide (@lucide-react).
 * 4. Uso de un hook local (.ts) transpilado dinámicamente.
 * 5. Estilos mediante TailwindCSS (del host).
 */
export const MyCustomView = ({ initialValue = 0 }) => {
  const { count, increment, decrement } = useCounter(initialValue);
  const toast = useToast();
  const [isloading, setLoader] = useState(false);
  const [data, setData] = useState<any>([
    {
      name: 'Angel',
      lastName: 'Garcia',
      email: '[EMAIL_ADDRESS]',
      phone: '123456789',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '12345',
      country: 'USA',
      notes: 'Some notes',
    },
  ]);

  useEffect(() => {
    setLoader(true);
    fetch('/api/plugins/helloWorld')
      .then((res) => res.json())
      .then((data) => {
        console.log(data);

        setData(data.data);
        setTimeout(() => {
          setLoader(false);
        }, 2000);
      });
  }, []);

  if (isloading) {
    return <Loader />;
  } else {
    return (
      <div>
        <Table
          columns={[
            { header: 'Nombre', accessor: 'name' },
            { header: 'Apellido', accessor: 'lastName' },
            { header: 'Email', accessor: 'email' },
            { header: 'Telefono', accessor: 'phone' },
            { header: 'Direccion', accessor: 'address' },
            { header: 'Ciudad', accessor: 'city' },
            { header: 'Provincia', accessor: 'state' },
            { header: 'Codigo Postal', accessor: 'zip' },
            { header: 'Pais', accessor: 'country' },
            { header: 'Notas', accessor: 'notes', className: 'w-1/2' },
          ]}
          data={data}
        ></Table>
      </div>
    );
  }
};

export default MyCustomView;
