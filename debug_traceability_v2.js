const { Client } = require('pg');

async function debug() {
  const client = new Client({
    connectionString: "postgresql://openfactu:openfactu_pass@127.0.0.1:5439/openfactudb"
  });

  try {
    await client.connect();
    const schema = 'tenant_openfactu';
    console.log(`Debugeando esquema: ${schema}`);

    // 1. Buscar el item "Laptop Pro"
    const items = await client.query(`SELECT id, name, code, "manageBy" FROM ${schema}."Item" WHERE name ILIKE '%Laptop%'`);
    console.log("Items encontrados:", items.rows);

    if (items.rows.length > 0) {
      for (const item of items.rows) {
        console.log(`\n--- Analizando Item: ${item.name} (${item.id}) ---`);
        console.log(`Gestionado por: ${item.manageBy}`);

        const serials = await client.query(`SELECT id, "serialNum", "itemId", status FROM ${schema}."ItemSerial" WHERE "itemId" = $1`, [item.id]);
        console.log("Seriados encontrados:", serials.rows);

        const batches = await client.query(`SELECT id, "batchNum", "itemId", quantity FROM ${schema}."ItemBatch" WHERE "itemId" = $1`, [item.id]);
        console.log("Lotes encontrados:", batches.rows);
      }
    } else {
        console.log("No se encontró el artículo 'Laptop Pro' en tenant_openfactu");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

debug();
