/**
 * Siembra contable express: crea un plan contable mínimo (PGC español
 * abreviado) y los AccountMapping básicos para que la generación
 * automática de asientos funcione sin configuración manual.
 *
 * Idempotente: si ya existe la cuenta por código, no la duplica.
 *
 * Se usa desde `POST /api/admin/seed-accounting` (un botón en UI) y al
 * activar el módulo contable por primera vez.
 */
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../db/schema';

interface AccountSeed {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
}

const ACCOUNTS: AccountSeed[] = [
  // Activo
  { code: '430000', name: 'Clientes', type: 'asset' },
  { code: '570000', name: 'Caja', type: 'asset' },
  { code: '572000', name: 'Bancos', type: 'asset' },
  { code: '472000', name: 'HP IVA Soportado', type: 'asset' },
  { code: '4751000', name: 'HP Acreedora IRPF', type: 'asset' },
  // Pasivo
  { code: '400000', name: 'Proveedores', type: 'liability' },
  { code: '410000', name: 'Acreedores por servicios', type: 'liability' },
  { code: '477000', name: 'HP IVA Repercutido', type: 'liability' },
  { code: '465000', name: 'Remuneraciones pendientes', type: 'liability' },
  { code: '476000', name: 'Seguridad Social acreedora', type: 'liability' },
  // Patrimonio
  { code: '100000', name: 'Capital social', type: 'equity' },
  { code: '120000', name: 'Reservas', type: 'equity' },
  { code: '129000', name: 'Resultado del ejercicio', type: 'equity' },
  // Ingresos
  { code: '700000', name: 'Ventas de mercaderías', type: 'income' },
  { code: '705000', name: 'Prestación de servicios', type: 'income' },
  // Gastos
  { code: '600000', name: 'Compras de mercaderías', type: 'expense' },
  { code: '629000', name: 'Otros servicios', type: 'expense' },
  { code: '640000', name: 'Sueldos y salarios', type: 'expense' },
  { code: '642000', name: 'Seguridad Social a cargo empresa', type: 'expense' },
];

// Mapeo de kind → code de cuenta a usar como default.
const MAPPINGS: Array<{ kind: string; code: string }> = [
  { kind: 'sales_revenue', code: '700000' },
  { kind: 'sales_vat_output', code: '477000' },
  { kind: 'customer_receivable', code: '430000' },
  { kind: 'purchase_expense', code: '600000' },
  { kind: 'purchase_vat_input', code: '472000' },
  { kind: 'supplier_payable', code: '400000' },
  { kind: 'cash', code: '570000' },
  { kind: 'bank', code: '572000' },
  { kind: 'payroll_gross', code: '640000' },
  { kind: 'payroll_irpf', code: '4751000' },
  { kind: 'payroll_ss_employee', code: '476000' },
  { kind: 'payroll_ss_employer', code: '642000' },
  { kind: 'payroll_net', code: '465000' },
  { kind: 'retained_earnings', code: '120000' },
  { kind: 'result', code: '129000' },
];

export async function seedAccountingDefaults(
  db: any,
): Promise<{ accountsCreated: number; mappingsCreated: number }> {
  let accountsCreated = 0;
  for (const a of ACCOUNTS) {
    const [existing] = await db
      .select()
      .from(schema.chartOfAccounts)
      .where(eq(schema.chartOfAccounts.code, a.code));
    if (existing) continue;
    await db.insert(schema.chartOfAccounts).values({
      id: crypto.randomUUID(),
      code: a.code,
      name: a.name,
      type: a.type,
      isAnalytical: false,
      isActive: true,
    });
    accountsCreated++;
  }

  // Resolver ID de cada cuenta para mapeos
  const accountsByCode: Record<string, string> = {};
  const all = await db.select().from(schema.chartOfAccounts);
  for (const a of all) accountsByCode[a.code] = a.id;

  let mappingsCreated = 0;
  for (const m of MAPPINGS) {
    const accountId = accountsByCode[m.code];
    if (!accountId) continue;
    const [existing] = await db
      .select()
      .from(schema.accountMappings)
      .where(
        and(eq(schema.accountMappings.kind, m.kind), eq(schema.accountMappings.key, 'default')),
      );
    if (existing) continue;
    await db.insert(schema.accountMappings).values({
      id: crypto.randomUUID(),
      kind: m.kind,
      key: 'default',
      accountId,
    });
    mappingsCreated++;
  }

  return { accountsCreated, mappingsCreated };
}
