import { Empresa } from '@openfactu/common';
import { tenants } from './src/db/schema';

console.log('Package resolution test:');
console.log('Empresa type available (compile time)');
console.log('Tenants table:', tenants);
