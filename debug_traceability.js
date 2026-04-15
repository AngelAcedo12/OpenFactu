const { Client } = require('pg');

async function debug() {
  const client = new Client({
    connectionString: "postgresql://openfactu:openfactu_pass@127.0.0.1:5439/openfactudb"
  });

  try {
    await client.connect();
    console.log("Conectado a la DB");

    // 1. Buscar el item
    const items = await client.query("SELECT id, name, code FROM public.\"Item\" WHERE name ILIKE '%Laptop%'");
    console.log("Items encontrados:", items.rows);

    if (items.rows.length > 0) {
      const itemId = items.rows[0].id;
      console.log(`Buscando seriados para itemId: ${itemId}`);

      const serials = await client.query("SELECT id, \"serialNum\", \"itemId\", status FROM public.\"ItemSerial\" WHERE \"itemId\" = $1", [itemId]);
      console.log("Seriados encontrados:", serials.rows);

      const batches = await client.query("SELECT id, \"batchNum\", \"itemId\", quantity FROM public.\"ItemBatch\" WHERE \"itemId\" = $1", [itemId]);
      console.log("Lotes encontrados:", batches.rows);
      
      const allSerials = await client.query("SELECT id, \"serialNum\", \"itemId\" FROM public.\"ItemSerial\" LIMIT 10");
      console.log("Muestra de seriados globales:", allSerials.rows);
    } else {
        console.log("No se encontró el artículo 'Laptop Pro' en el esquema público");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

debug();
