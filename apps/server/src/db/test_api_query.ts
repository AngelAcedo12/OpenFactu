import { ClientFactory } from '../core/tenant/ClientFactory';
import * as schema from './schema';
import { eq, desc, sql, and } from 'drizzle-orm';

async function test() {
  const tDb = ClientFactory.getClient('tenant_openfactu');
  const id = '1674394b-4c57-4de1-a385-bd82ac92ae7e'; // Laptop Pro
  const warehouseId = 'cf02ea05-f03f-4fc0-b8fd-0c710163726c'; // Almacen Principal

  console.log('--- Running Query with Warehouse Filter ---');
  let query = tDb
    .select({
      id: schema.itemBatches.id,
      batchNum: schema.itemBatches.batchNum,
      quantity: schema.itemBatches.quantity,
      warehouseId: schema.purchaseDeliveryNoteLines.warehouseId,
    })
    .from(schema.itemBatches)
    .leftJoin(
      schema.purchaseDeliveryNoteLineBatches,
      eq(schema.itemBatches.batchNum, schema.purchaseDeliveryNoteLineBatches.batchNum),
    )
    .leftJoin(
      schema.purchaseDeliveryNoteLines,
      eq(
        schema.purchaseDeliveryNoteLineBatches.deliveryLineId,
        schema.purchaseDeliveryNoteLines.id,
      ),
    )
    .where(
      and(
        eq(schema.itemBatches.itemId, id),
        sql`${schema.itemBatches.quantity} > 0`,
        eq(schema.purchaseDeliveryNoteLines.warehouseId, warehouseId),
      ),
    );

  const results = await query;
  console.log('Results:', results);

  console.log('--- Running Query WITHOUT Warehouse Filter ---');
  let query2 = tDb
    .select({
      id: schema.itemBatches.id,
      batchNum: schema.itemBatches.batchNum,
      quantity: schema.itemBatches.quantity,
      warehouseId: schema.purchaseDeliveryNoteLines.warehouseId,
      lineItemId: schema.purchaseDeliveryNoteLines.itemId,
    })
    .from(schema.itemBatches)
    .leftJoin(
      schema.purchaseDeliveryNoteLineBatches,
      eq(schema.itemBatches.batchNum, schema.purchaseDeliveryNoteLineBatches.batchNum),
    )
    .leftJoin(
      schema.purchaseDeliveryNoteLines,
      eq(
        schema.purchaseDeliveryNoteLineBatches.deliveryLineId,
        schema.purchaseDeliveryNoteLines.id,
      ),
    )
    .where(and(eq(schema.itemBatches.itemId, id), sql`${schema.itemBatches.quantity} > 0`));

  const results2 = await query2;
  console.log('Results 2:', results2);
}
test();
