import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { HookManager } from '../plugins/HookManager';
import { PluginFieldManager } from '../plugins/PluginFieldManager';
import * as schema from '../../db/schema';

export interface DocumentLine {
    itemId: string;
    quantity: number | string;
    price: number | string;
    taxGroupId: string;
    warehouseId?: string;
    zoneId?: string;
    batchDetails?: Array<{
        batchNum: string;
        quantity: number;
        expiryDate?: Date;
    }>;
    baseType?: string;
    baseId?: string;
    baseLine?: number;
    [key: string]: any;
}

export interface DocumentCreateRequest {
    seriesId: string;
    periodId: string;
    partnerId: string;
    date: Date | string;
    warehouseId?: string;
    lines: DocumentLine[];
    [key: string]: any;
}

export interface DocumentDefinition {
    tableName: string;
    schemaTable: any;
    lineSchemaTable: any;
    batchSchemaTable?: any;
    eventPrefix: string;
    stockAction: 'IN' | 'OUT' | 'NONE';
    closeBaseDocuments?: boolean; // Si debe cerrar albaranes base al facturar
}

export class DocumentEngine {
    /**
     * Motor Universal de Creación de Documentos
     */
    public static async create(
        tenantId: string,
        db: any, // req.tenantClient 
        user: any,
        def: DocumentDefinition,
        request: DocumentCreateRequest
    ) {
        // 1. Validar y extraer campos de plugins
        const pluginFields = await PluginFieldManager.validateAndExtract(def.eventPrefix.charAt(0).toUpperCase() + def.eventPrefix.slice(1), request);

        const result = await db.transaction(async (tx: any) => {
            // 2. Numeración
            const [series] = await tx.select().from(schema.documentSeries).where(eq(schema.documentSeries.id, request.seriesId));
            if (!series) throw new Error('Serie no encontrada');
            const docNum = series.nextNumber;

            // 3. Pre-calcular totales para validación de hooks
            const allTaxGroups = await tx.select().from(schema.taxGroups);
            const taxRateMap = allTaxGroups.reduce((acc: any, curr: any) => {
                acc[curr.id] = Number(curr.rate);
                return acc;
            }, {});

            let preliminarySubtotal = 0;
            let preliminaryTaxTotal = 0;
            for (const line of request.lines) {
                const lineSubtotal = Number(line.quantity || 0) * Number(line.price || 0);
                const taxRate = taxRateMap[line.taxGroupId] || 0;
                preliminarySubtotal += lineSubtotal;
                preliminaryTaxTotal += (lineSubtotal * taxRate) / 100;
            }

            // 4. Hook Before Create
            await HookManager.trigger(`${def.eventPrefix}.beforeCreate`, {
                tenantId,
                db: tx,
                data: { 
                    ...request, 
                    docNum,
                    subtotal: preliminarySubtotal,
                    taxTotal: preliminaryTaxTotal,
                    total: preliminarySubtotal + preliminaryTaxTotal
                },
                user
            });

            // Actualizar número de serie
            await tx.update(schema.documentSeries).set({ nextNumber: docNum + 1 }).where(eq(schema.documentSeries.id, request.seriesId));

            const documentId = crypto.randomUUID();
            let calculatedSubtotal = 0;
            let calculatedTaxTotal = 0;
            const breakdownMap: Record<string, { base: number, tax: number }> = {};

            // 4. Insertar Cabecera (Temporales a 0)
            const headerValues: any = {
                id: documentId,
                seriesId: request.seriesId,
                docNum,
                periodId: request.periodId,
                partnerId: request.partnerId,
                date: new Date(request.date),
                status: 'O',
                billToAddress: request.billToAddress || null,
                shipToAddress: request.shipToAddress || null,
                subtotal: '0',
                taxTotal: '0',
                total: '0',
                taxBreakdown: '{}',
                ...pluginFields
            };

            // Añadir warehouseId si la tabla lo soporta
            if (def.schemaTable.warehouseId) {
                headerValues.warehouseId = request.warehouseId || null;
            }

            await tx.insert(def.schemaTable).values(headerValues);

            // 5. Procesar Líneas
            for (let i = 0; i < request.lines.length; i++) {
                const line = request.lines[i];
                const [itemInfo] = await tx.select().from(schema.items).where(eq(schema.items.id, line.itemId));
                if (!itemInfo) throw new Error(`Artículo ${line.itemId} no encontrado`);

                // Validación de Trazabilidad
                if (itemInfo.manageBy !== 'N' && def.batchSchemaTable) {
                    const totalBatched = (line.batchDetails || []).reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0);
                    if (totalBatched < Number(line.quantity)) {
                        throw new Error(`Artículo ${itemInfo.name} requiere trazabilidad. Pendiente: ${Number(line.quantity) - totalBatched}`);
                    }
                }

                const lineSubtotal = Number(line.quantity) * Number(line.price);
                const taxRate = taxRateMap[line.taxGroupId] || 0;
                const lineTax = lineSubtotal * (taxRate / 100);

                calculatedSubtotal += lineSubtotal;
                calculatedTaxTotal += lineTax;

                const rateKey = String(taxRate);
                if (!breakdownMap[rateKey]) breakdownMap[rateKey] = { base: 0, tax: 0 };
                breakdownMap[rateKey].base += lineSubtotal;
                breakdownMap[rateKey].tax += lineTax;

                const lineId = crypto.randomUUID();
                
                // Insertar Línea
                const lineValues: any = {
                    id: lineId,
                    lineNum: i + 1,
                    itemId: line.itemId,
                    quantity: String(line.quantity),
                    price: String(line.price),
                    taxGroupId: line.taxGroupId || null,
                    lineTotal: String(lineSubtotal + lineTax)
                };

                // Mapear el ID de cabecera según la tabla
                const headerRefKey = def.tableName === 'salesInvoices' ? 'invoiceId' : 
                                   def.tableName === 'purchaseInvoices' ? 'invoiceId' :
                                   def.tableName === 'salesDeliveryNotes' ? 'deliveryId' : 'orderId';
                
                lineValues[headerRefKey] = documentId;
                
                if (def.lineSchemaTable.warehouseId) lineValues.warehouseId = line.warehouseId || request.warehouseId || null;
                if (line.baseType) lineValues.baseType = line.baseType;
                if (line.baseId) lineValues.baseId = line.baseId;
                if (line.baseLine) lineValues.baseLine = line.baseLine;

                await tx.insert(def.lineSchemaTable).values(lineValues);

                // 6. Gestionar Stock y Lotes
                if (def.stockAction !== 'NONE' || line.batchDetails) {
                    await this.processInventory(tx, itemInfo, line, def.stockAction, def.batchSchemaTable, lineId, request.warehouseId);
                }
            }

            // 7. Actualizar Totales Finales
            const finalTotal = calculatedSubtotal + calculatedTaxTotal;
            await tx.update(def.schemaTable)
                .set({
                    subtotal: String(calculatedSubtotal.toFixed(4)),
                    taxTotal: String(calculatedTaxTotal.toFixed(4)),
                    total: String(finalTotal.toFixed(4)),
                    taxBreakdown: JSON.stringify(breakdownMap)
                })
                .where(eq(def.schemaTable.id, documentId));

            // 8. Cierre de documentos base (si aplica)
            if (def.closeBaseDocuments) {
                const baseMap: Record<string, Set<string>> = {};
                for (const l of request.lines) {
                    if (!l.baseId || !l.baseType) continue;
                    if (!baseMap[l.baseType]) baseMap[l.baseType] = new Set();
                    baseMap[l.baseType].add(l.baseId);
                }
                const baseTables: Record<string, any> = {
                    SDN: schema.salesDeliveryNotes,
                    PDN: schema.purchaseDeliveryNotes,
                    SO: schema.salesOrders,
                    PO: schema.purchaseOrders
                };
                for (const [baseType, ids] of Object.entries(baseMap)) {
                    const table = baseTables[baseType];
                    if (!table) continue;
                    for (const bId of ids) {
                        await tx.update(table).set({ status: 'C' }).where(eq(table.id, bId));
                    }
                }
            }

            // 9. Hook After Create
            await HookManager.trigger(`${def.eventPrefix}.afterCreate`, {
                tenantId,
                db: tx,
                data: { ...request, id: documentId, docNum },
                user
            });

            return { id: documentId, docNum };
        });

        return result;
    }

    private static async processInventory(tx: any, item: any, line: DocumentLine, action: 'IN' | 'OUT' | 'NONE', batchTable: any, lineId: string, globalWarehouseId?: string) {
        const qty = Number(line.quantity);
        const warehouseId = line.warehouseId || globalWarehouseId;

        // A. Stock Global
        if (action === 'OUT') {
            await tx.update(schema.items).set({ stock: sql`${schema.items.stock} - ${qty}` }).where(eq(schema.items.id, item.id));
        } else if (action === 'IN') {
             await tx.update(schema.items).set({ stock: sql`${schema.items.stock} + ${qty}` }).where(eq(schema.items.id, item.id));
        }

        // B. Stock por Almacén
        if (warehouseId && action !== 'NONE') {
             const [stockRecord] = await tx.select().from(schema.itemWarehouseStocks)
                .where(sql`${schema.itemWarehouseStocks.itemId} = ${item.id} AND ${schema.itemWarehouseStocks.warehouseId} = ${warehouseId}`);
             
             if (stockRecord) {
                 const newStock = action === 'OUT' ? Number(stockRecord.stock) - qty : Number(stockRecord.stock) + qty;
                 await tx.update(schema.itemWarehouseStocks).set({ stock: newStock, updatedAt: new Date() }).where(eq(schema.itemWarehouseStocks.itemId, item.id));
             } else if (action === 'IN') {
                 await tx.insert(schema.itemWarehouseStocks).values({
                     itemId: item.id,
                     warehouseId,
                     stock: qty,
                     updatedAt: new Date()
                 });
             }
        }

        // C. Lotes y Series
        if (line.batchDetails && batchTable) {
            for (const bd of line.batchDetails) {
                const batchId = crypto.randomUUID();
                const values: any = {
                    id: batchId,
                    batchNum: bd.batchNum,
                    quantity: bd.quantity,
                };

                // Detectar FK de línea
                if (batchTable.invoiceLineId) values.invoiceLineId = lineId;
                else if (batchTable.deliveryLineId) values.deliveryLineId = lineId;

                await tx.insert(batchTable).values(values);

                // Actualizar maestro de lotes
                const [existingBatch] = await tx.select().from(schema.itemBatches)
                    .where(sql`${schema.itemBatches.itemId} = ${item.id} AND ${schema.itemBatches.batchNum} = ${bd.batchNum}`);
                
                if (existingBatch) {
                    const newQty = action === 'OUT' ? Number(existingBatch.quantity) - bd.quantity : Number(existingBatch.quantity) + bd.quantity;
                    await tx.update(schema.itemBatches).set({ quantity: newQty }).where(eq(schema.itemBatches.id, existingBatch.id));
                } else if (action === 'IN') {
                    await tx.insert(schema.itemBatches).values({
                        id: crypto.randomUUID(),
                        itemId: item.id,
                        batchNum: bd.batchNum,
                        quantity: bd.quantity,
                        expiryDate: bd.expiryDate ? new Date(bd.expiryDate) : null
                    });
                }
            }
        }
    }
}
