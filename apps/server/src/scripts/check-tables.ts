import { ClientFactory } from '../core/tenant/ClientFactory';

async function checkTables() {
  const pc = ClientFactory.getClient('public');
  const schema = 'tenant_prueba111';
  console.log(`--- Verificando Tablas en ${schema} ---`);
  
  try {
    const tables: any = await pc.$queryRawUnsafe(
      `SELECT table_name::TEXT FROM information_schema.tables WHERE table_schema = $1`, 
      schema
    );
    console.log('Resultados:', tables);
    
    const columnsItem: any = await pc.$queryRawUnsafe(
      `SELECT column_name::TEXT FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'Item'`,
      schema
    );
    console.log('Columnas de Item:', columnsItem.map((c: any) => c.column_name));

  } catch (err: any) {
    console.error('Error:', err.message);
  }

  process.exit(0);
}

checkTables();
