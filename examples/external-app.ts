/**
 * ════════════════════════════════════════════════════════════════
 *  EJEMPLO: Aplicación externa usando FactuAPI
 * ════════════════════════════════════════════════════════════════
 *
 *  Demuestra cómo una app EXTERNA se conecta a OpenFactu
 *  y crea documentos con transacciones e IDs pre-asignados.
 *
 *  Ejecutar:
 *    npx tsx examples/external-app.ts
 * ════════════════════════════════════════════════════════════════
 */

import { FactuApi, FactuApiTransaction } from '../apps/server/src/core/plugins/FactuApi';

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log(' OpenFactu — FactuAPI External App Demo');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // ─────────────────────────────────────────────────────────
    //  1. SESIÓN — Login + Tenant en una sola llamada
    //     Esto resuelve: autenticación, tenant, y conexión a BD
    // ─────────────────────────────────────────────────────────

    const ctx = await FactuApi.session(
      'admin@openfactu.com',  // email o username
      'admin123',              // password
      // 'Mi Empresa',         // nombre del tenant (opcional, usa el primero si no se indica)
    );

    console.log(`[1] Sesión iniciada:`);
    console.log(`    Usuario: ${ctx.user.email} (${ctx.user.role})`);
    console.log(`    Tenant:  ${ctx.tenantName} (${ctx.tenantId})`);
    console.log(`    Token:   ${ctx.token.substring(0, 30)}...`);

    // ─────────────────────────────────────────────────────────
    //  2. CONSULTAR DATOS — Usar ctx.api para queries
    // ─────────────────────────────────────────────────────────

    const series = await ctx.api.getSeries('SINV');
    const seriesSDN = await ctx.api.getSeries('SDN');
    const seriesSO = await ctx.api.getSeries('SO');
    const periods = await ctx.api.getOpenPeriods();

    console.log(`\n[2] Datos del tenant:`);
    console.log(`    Series SINV: ${series.map((s: any) => s.prefix).join(', ') || '(ninguna)'}`);
    console.log(`    Series SDN:  ${seriesSDN.map((s: any) => s.prefix).join(', ') || '(ninguna)'}`);
    console.log(`    Series SO:   ${seriesSO.map((s: any) => s.prefix).join(', ') || '(ninguna)'}`);
    console.log(`    Periodos:    ${periods.length} abiertos`);

    // ─────────────────────────────────────────────────────────
    //  También se puede obtener el tenant de otras formas:
    // ─────────────────────────────────────────────────────────

    // Por nombre
    const tenant = await FactuApi.getTenantByName(ctx.tenantName);
    console.log(`\n    getTenantByName('${ctx.tenantName}') → id: ${tenant?.id}`);

    // Por ID
    const tenantById = await FactuApi.getTenant(ctx.tenantId);
    console.log(`    getTenant('${ctx.tenantId}') → name: ${tenantById?.name}`);

    // Listar todos
    const allTenants = await FactuApi.getTenants();
    console.log(`    getTenants() → ${allTenants.map((t: any) => t.name).join(', ')}`);

    // Obtener solo la BD de un tenant (si ya tienes el ID)
    const db = await FactuApi.getTenantDb(ctx.tenantId);
    console.log(`    getTenantDb('${ctx.tenantId}') → drizzle client listo`);

    // ─────────────────────────────────────────────────────────
    //  3. IDs PRE-ASIGNADOS — El ID existe antes de guardar
    // ─────────────────────────────────────────────────────────

    const invoice = ctx.api.salesInvoice();
    const deliveryNote = ctx.api.salesDeliveryNote();

    console.log(`\n[3] IDs pre-asignados (antes de save):`);
    console.log(`    Factura:  ${invoice.id}`);
    console.log(`    Albarán:  ${deliveryNote.id}`);

    // ─────────────────────────────────────────────────────────
    //  4. BUSCAR DATOS — Partners, Items, etc.
    // ─────────────────────────────────────────────────────────

    // Buscar partner por ID
    // const partner = await ctx.api.getPartner('some-id');

    // Buscar item por ID o código
    // const item = await ctx.api.getItem('PROD-001');

    // Query directo con drizzle
    // const items = await ctx.api.db.select().from(schema.items).limit(10);

    // ─────────────────────────────────────────────────────────
    //  5. CREAR FACTURA SIMPLE (sin transacción)
    // ─────────────────────────────────────────────────────────

    // Descomenta esto si tienes datos de prueba:
    /*
    const inv = ctx.api.salesInvoice();
    inv.partnerId = 'partner-id-aqui';
    inv.seriesId = series[0].id;
    inv.periodId = periods[0].id;
    inv.addLine({
      itemId: 'item-id-aqui',
      quantity: 2,
      price: 100,
      taxGroupId: 'tax-group-id-aqui',
    });
    const result = await ctx.api.save(inv);
    console.log(`Factura creada: #${result.docNum} (${result.id})`);
    */

    // ─────────────────────────────────────────────────────────
    //  6. TRANSACCIÓN ATÓMICA — Albarán + Factura
    // ─────────────────────────────────────────────────────────

    // Descomenta esto si tienes datos de prueba:
    /*
    const txResult = await FactuApi.transaction(
      ctx.tenantId, ctx.db, ctx.user,
      async (tx: FactuApiTransaction) => {
        // Crear albarán
        const albaran = tx.salesDeliveryNote();
        albaran.partnerId = 'partner-id';
        albaran.seriesId = 'series-sdn-id';
        albaran.periodId = 'period-id';
        albaran.addLine({
          itemId: 'item-id',
          quantity: 5,
          price: 50,
          taxGroupId: 'tax-id',
        });
        await tx.save(albaran);

        // Crear factura referenciando al albarán
        const factura = tx.salesInvoice();
        factura.partnerId = albaran.partnerId;
        factura.seriesId = 'series-sinv-id';
        factura.periodId = 'period-id';
        factura.addLine({
          itemId: 'item-id',
          quantity: 5,
          price: 50,
          taxGroupId: 'tax-id',
          baseType: 'SDN',
          baseId: albaran.id,  // ID pre-asignado
        });
        await tx.save(factura);

        return {
          albaran: { id: albaran.id },
          factura: { id: factura.id },
        };
      },
    );
    console.log('Transacción completada:', txResult);
    */

    // ─────────────────────────────────────────────────────────
    //  7. FLUJO COMPLETO — Pedido → Albarán → Factura
    // ─────────────────────────────────────────────────────────

    // Descomenta esto si tienes datos de prueba:
    /*
    const fullResult = await FactuApi.transaction(
      ctx.tenantId, ctx.db, ctx.user,
      async (tx: FactuApiTransaction) => {
        const line = { itemId: 'item-id', quantity: 10, price: 25.50, taxGroupId: 'tax-id' };

        const pedido = tx.salesOrder();
        pedido.partnerId = 'partner-id';
        pedido.seriesId = 'series-so-id';
        pedido.periodId = 'period-id';
        pedido.addLine(line);
        await tx.save(pedido);

        const albaran = tx.salesDeliveryNote();
        albaran.partnerId = pedido.partnerId;
        albaran.seriesId = 'series-sdn-id';
        albaran.periodId = 'period-id';
        albaran.orderId = pedido.id;
        albaran.addLine({ ...line, baseType: 'SO', baseId: pedido.id });
        await tx.save(albaran);

        const factura = tx.salesInvoice();
        factura.partnerId = pedido.partnerId;
        factura.seriesId = 'series-sinv-id';
        factura.periodId = 'period-id';
        factura.addLine({ ...line, baseType: 'SDN', baseId: albaran.id });
        await tx.save(factura);

        return {
          pedido:  pedido.id,
          albaran: albaran.id,
          factura: factura.id,
        };
      },
    );
    console.log('Flujo completo:', fullResult);
    */

    // ─────────────────────────────────────────────────────────
    //  8. ROLLBACK — Si algo falla, todo se revierte
    // ─────────────────────────────────────────────────────────

    /*
    try {
      await FactuApi.transaction(ctx.tenantId, ctx.db, ctx.user, async (tx) => {
        const doc1 = tx.salesInvoice();
        doc1.partnerId = '...';
        // ... configurar y guardar doc1
        await tx.save(doc1);

        // Esto fuerza rollback de doc1 también
        throw new Error('Error simulado');
      });
    } catch (e: any) {
      console.log('Rollback ejecutado:', e.message);
    }
    */

    console.log('\n═══════════════════════════════════════════════');
    console.log(' Demo completada');
    console.log('═══════════════════════════════════════════════');
  } catch (error: any) {
    console.error('\nError:', error.message);
  } finally {
    await FactuApi.disconnect();
  }
}

main();
