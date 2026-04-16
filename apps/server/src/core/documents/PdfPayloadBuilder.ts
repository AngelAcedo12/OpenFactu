import { eq, inArray, desc } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type {
  DocType,
  DocumentPdfPayload,
  DocumentLineData,
  TaxBreakdownEntry,
  PartnerAddressObject,
} from '@openfactu/pdf';
import { amountToSpanishWords } from '../../utils/numberToWords';

interface DocTypeTables {
  header: any;
  lines: any;
  batches: any | null;
  lineFk: string;
  supportsBase: boolean;
  baseType?: string;
  baseTable?: any;
}

const TABLE_MAP: Record<DocType, DocTypeTables> = {
  SINV: {
    header: schema.salesInvoices,
    lines: schema.salesInvoiceLines,
    batches: schema.salesInvoiceLineBatches,
    lineFk: 'invoiceId',
    supportsBase: true,
    baseType: 'SDN',
    baseTable: schema.salesDeliveryNotes,
  },
  PINV: {
    header: schema.purchaseInvoices,
    lines: schema.purchaseInvoiceLines,
    batches: schema.purchaseInvoiceLineBatches,
    lineFk: 'invoiceId',
    supportsBase: true,
    baseType: 'PDN',
    baseTable: schema.purchaseDeliveryNotes,
  },
  SDN: {
    header: schema.salesDeliveryNotes,
    lines: schema.salesDeliveryNoteLines,
    batches: schema.salesDeliveryNoteLineBatches,
    lineFk: 'deliveryId',
    supportsBase: false,
  },
  PDN: {
    header: schema.purchaseDeliveryNotes,
    lines: schema.purchaseDeliveryNoteLines,
    batches: schema.purchaseDeliveryNoteLineBatches,
    lineFk: 'deliveryId',
    supportsBase: false,
  },
  SO: {
    header: schema.salesOrders,
    lines: schema.salesOrderLines,
    batches: null,
    lineFk: 'orderId',
    supportsBase: false,
  },
  PO: {
    header: schema.purchaseOrders,
    lines: schema.purchaseOrderLines,
    batches: null,
    lineFk: 'orderId',
    supportsBase: false,
  },
};

const STATUS_LABELS: Record<string, string> = {
  O: 'Abierto',
  C: 'Cerrado',
  X: 'Cancelado',
  P: 'Parcial',
  D: 'Borrador',
};

function parseTaxBreakdown(raw: any): TaxBreakdownEntry[] {
  if (!raw) return [];
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Object.entries(obj).map(([rate, v]: any) => ({
      rate: Number(rate),
      base: Number(v.base || 0),
      tax: Number(v.tax || 0),
    }));
  } catch {
    return [];
  }
}

function formatDocCode(prefix: string | null, periodCode: string | null, docNum: number): string {
  const p = prefix || '';
  const c = periodCode || '';
  return `${p}-${c}-${String(docNum).padStart(6, '0')}`;
}

function formatAddressString(addr: any, countryName?: string | null): string | null {
  if (!addr) return null;
  const parts: string[] = [];
  if (addr.street) parts.push(addr.street);
  const cityLine: string[] = [];
  if (addr.zipCode) cityLine.push(addr.zipCode);
  if (addr.city) cityLine.push(addr.city);
  if (cityLine.length > 0) parts.push(cityLine.join(' '));
  if (addr.state) parts.push(addr.state);
  // Si tenemos countryName (desde Country.name), lo usamos; si no, fallback a addr.country text
  const country = countryName || addr.country;
  if (country) parts.push(country);
  return parts.length > 0 ? parts.join(', ') : null;
}

function addressObject(addr: any): PartnerAddressObject | null {
  if (!addr) return null;
  return {
    street: addr.street || null,
    city: addr.city || null,
    state: addr.state || null,
    zipCode: addr.zipCode || null,
    country: addr.country || null,
  };
}

export class PdfPayloadBuilder {
  public static async build(
    docType: DocType,
    documentId: string,
    db: any,
  ): Promise<DocumentPdfPayload> {
    const map = TABLE_MAP[docType];
    if (!map) throw new Error(`Tipo de documento no soportado: ${docType}`);

    // 1. Header + series + period
    const [headerRow] = await db
      .select({
        header: map.header,
        seriesPrefix: schema.documentSeries.prefix,
        periodCode: schema.accountingPeriods.code,
      })
      .from(map.header)
      .leftJoin(schema.documentSeries, eq(map.header.seriesId, schema.documentSeries.id))
      .leftJoin(schema.accountingPeriods, eq(map.header.periodId, schema.accountingPeriods.id))
      .where(eq(map.header.id, documentId));

    if (!headerRow) throw new Error(`Documento ${documentId} no encontrado`);
    const header = headerRow.header;

    // 2. Partner + priceList
    const [partner] = await db
      .select()
      .from(schema.businessPartners)
      .where(eq(schema.businessPartners.id, header.partnerId));

    let priceListName: string | null = null;
    if (partner?.priceListId) {
      const [pl] = await db
        .select()
        .from(schema.priceLists)
        .where(eq(schema.priceLists.id, partner.priceListId));
      priceListName = pl?.name || null;
    }

    // 2.b Partner addresses (default + billing + shipping)
    let defaultAddr: any = null;
    let billingAddr: any = null;
    let shippingAddr: any = null;
    if (partner) {
      const addresses = await db
        .select()
        .from(schema.partnerAddresses)
        .where(eq(schema.partnerAddresses.partnerId, partner.id));
      defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0] || null;
      billingAddr = addresses.find((a: any) => a.type === 'B') || defaultAddr;
      shippingAddr = addresses.find((a: any) => a.type === 'S') || defaultAddr;
    }

    // 2.c Resolver nombre del país del partner (desde la tabla public Country)
    let partnerCountryName: string | null = null;
    const partnerCountryCode = partner?.countryCode || defaultAddr?.countryCode;
    if (partnerCountryCode) {
      try {
        const publicDb = (await import('../tenant/ClientFactory')).ClientFactory.getClient(
          'public',
        );
        const [country] = await publicDb
          .select({ name: schema.countries.name })
          .from(schema.countries)
          .where(eq(schema.countries.code, partnerCountryCode.toUpperCase()));
        partnerCountryName = country?.name || null;
      } catch {
        /* ignorar */
      }
    }

    // 3. Lines
    const lineRows = await db.select().from(map.lines).where(eq(map.lines[map.lineFk], documentId));

    // 4. Items + UoM + Category (batch fetch)
    const itemIds = [...new Set(lineRows.map((l: any) => l.itemId))];
    const itemList =
      itemIds.length > 0
        ? await db
            .select()
            .from(schema.items)
            .where(inArray(schema.items.id, itemIds as string[]))
        : [];
    const itemsMap = new Map(itemList.map((i: any) => [i.id, i]));

    // UoMs: recoger tanto las base de los artículos como las elegidas por línea
    const uomIds = [
      ...new Set([
        ...itemList.map((i: any) => i.uomId),
        ...lineRows.map((l: any) => l.uomId),
      ].filter(Boolean)),
    ];
    const uomList =
      uomIds.length > 0
        ? await db
            .select()
            .from(schema.unitsOfMeasure)
            .where(inArray(schema.unitsOfMeasure.id, uomIds as string[]))
        : [];
    const uomMap = new Map(uomList.map((u: any) => [u.id, u.code]));

    const categoryIds = [...new Set(itemList.map((i: any) => i.categoryId).filter(Boolean))];
    const catList =
      categoryIds.length > 0
        ? await db
            .select()
            .from(schema.categories)
            .where(inArray(schema.categories.id, categoryIds as string[]))
        : [];
    const catMap = new Map(catList.map((c: any) => [c.id, c.name]));

    // 5. Tax groups
    const taxIds = [...new Set(lineRows.map((l: any) => l.taxGroupId).filter(Boolean))];
    const taxList =
      taxIds.length > 0
        ? await db
            .select()
            .from(schema.taxGroups)
            .where(inArray(schema.taxGroups.id, taxIds as string[]))
        : [];
    const taxRateMap = new Map(taxList.map((t: any) => [t.id, Number(t.rate)]));

    // 6. Batches per line
    let batchesMap = new Map<string, Array<{ batchNum: string; quantity: number }>>();
    if (map.batches && lineRows.length > 0) {
      const fkCol = 'invoiceLineId' in map.batches ? 'invoiceLineId' : 'deliveryLineId';
      const lineIds = lineRows.map((l: any) => l.id);
      const batchRows = await db
        .select()
        .from(map.batches)
        .where(inArray((map.batches as any)[fkCol], lineIds));
      for (const b of batchRows) {
        const lineId = (b as any)[fkCol];
        const arr = batchesMap.get(lineId) || [];
        arr.push({ batchNum: b.batchNum, quantity: Number(b.quantity) });
        batchesMap.set(lineId, arr);
      }
    }

    // 7. Base document code
    let baseDocCode: string | null = null;
    if (map.supportsBase && map.baseTable && map.baseType) {
      const linesWithBase = lineRows.filter((l: any) => l.baseType === map.baseType && l.baseId);
      if (linesWithBase.length > 0) {
        const baseIds = [...new Set(linesWithBase.map((l: any) => l.baseId))];
        const [baseRow] = await db
          .select({
            docNum: map.baseTable.docNum,
            prefix: schema.documentSeries.prefix,
            periodCode: schema.accountingPeriods.code,
          })
          .from(map.baseTable)
          .leftJoin(schema.documentSeries, eq(map.baseTable.seriesId, schema.documentSeries.id))
          .leftJoin(
            schema.accountingPeriods,
            eq(map.baseTable.periodId, schema.accountingPeriods.id),
          )
          .where(inArray(map.baseTable.id, baseIds as string[]));
        if (baseRow) {
          baseDocCode = formatDocCode(baseRow.prefix, baseRow.periodCode, baseRow.docNum);
        }
      }
    }

    // 8. Company info desde SystemConfig
    const companyRows = await db.select().from(schema.systemConfigs);
    const cfg: Record<string, string> = {};
    for (const r of companyRows) cfg[r.key] = r.value || '';
    const configVal = (snake: string, camel: string): string | null =>
      cfg[snake] || cfg[camel] || null;

    // 8b. Plugin fields — campos custom de la cabecera
    const pluginFieldRows = await db.select().from(schema.pluginFields);
    const headerTableName = {
      SINV: 'SalesInvoice', PINV: 'PurchaseInvoice',
      SDN: 'SalesDeliveryNote', PDN: 'PurchaseDeliveryNote',
      SO: 'SalesOrder', PO: 'PurchaseOrder',
    }[docType] || '';
    const headerPluginFields = pluginFieldRows.filter((pf: any) => pf.tableName === headerTableName);
    const customFields: Record<string, any> = {};
    for (const pf of headerPluginFields) {
      if (header[pf.fieldName] != null) {
        customFields[pf.fieldName] = header[pf.fieldName];
      }
    }

    const lineTableName = headerTableName + 'Line';
    const linePluginFields = pluginFieldRows.filter((pf: any) => pf.tableName === lineTableName);

    // 9. Líneas — ordenar y mapear
    const lines: DocumentLineData[] = lineRows
      .sort((a: any, b: any) => (a.lineNum || 0) - (b.lineNum || 0))
      .map((l: any) => {
        const it: any = itemsMap.get(l.itemId);
        // Preferir la UoM elegida en la línea; si no hay, la base del artículo
        const effectiveUomId = l.uomId || it?.uomId;
        const uomCode = effectiveUomId ? (uomMap.get(effectiveUomId) as string | undefined) || null : null;
        const category = it?.categoryId
          ? (catMap.get(it.categoryId) as string | undefined) || null
          : null;
        // Plugin fields de la línea (columnas p_* o desde pluginData jsonb)
        const lineCustom: Record<string, any> = {};
        for (const pf of linePluginFields) {
          const val = l.pluginData?.[pf.fieldName] ?? l[pf.fieldName];
          if (val != null) lineCustom[pf.fieldName] = val;
        }

        return {
          lineNum: l.lineNum,
          itemId: l.itemId,
          itemCode: it?.code || '',
          itemName: it?.name || 'Artículo',
          itemDescription: it?.description || null,
          quantity: Number(l.quantity),
          uom: uomCode,
          price: Number(l.price),
          taxRate: (taxRateMap.get(l.taxGroupId) as number) ?? 0,
          lineTotal: Number(l.lineTotal),
          category,
          batches: batchesMap.get(l.id) || [],
          customFields: Object.keys(lineCustom).length > 0 ? lineCustom : undefined,
        };
      });

    // 10. Total en letras
    const totalInWords = amountToSpanishWords(Number(header.total));

    return {
      doc: {
        id: header.id,
        docCode: formatDocCode(headerRow.seriesPrefix, headerRow.periodCode, header.docNum),
        date: new Date(header.date).toLocaleDateString('es-ES'),
        status: header.status,
        statusLabel: STATUS_LABELS[header.status] || header.status,
        subtotal: Number(header.subtotal),
        taxTotal: Number(header.taxTotal),
        total: Number(header.total),
        totalInWords,
        taxBreakdown: parseTaxBreakdown(header.taxBreakdown),
        billToAddress: header.billToAddress || null,
        shipToAddress: header.shipToAddress || null,
        baseDocCode,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      },
      partner: {
        id: partner?.id || '',
        name: partner?.name || '',
        foreignName: partner?.foreignName || null,
        taxId: partner?.nif || null,
        address: formatAddressString(defaultAddr, partnerCountryName),
        billingAddress: addressObject(billingAddr),
        shippingAddress: addressObject(shippingAddr),
        email: partner?.email || null,
        phone: partner?.phone || null,
        website: partner?.website || null,
        priceListName,
      },
      company: {
        name: configVal('company_name', 'companyName') || 'Mi Empresa',
        taxId: configVal('company_tax_id', 'companyTaxId'),
        address: configVal('company_address', 'companyAddress'),
        phone: configVal('company_phone', 'companyPhone'),
        email: configVal('company_email', 'companyEmail'),
        website: configVal('company_website', 'companyWebsite'),
        logoUrl: configVal('company_logo_url', 'companyLogoUrl'),
      },
      lines,
      generatedAt: new Date().toLocaleString('es-ES'),
    };
  }

  /**
   * Devuelve un payload fixture para preview sin sampleDocId.
   */
  public static fixture(_docType: DocType): DocumentPdfPayload {
    return {
      doc: {
        id: 'preview',
        docCode: 'FAC-A-2026-000042',
        date: new Date().toLocaleDateString('es-ES'),
        status: 'O',
        statusLabel: 'Abierto',
        subtotal: 1000.0,
        taxTotal: 210.0,
        total: 1210.0,
        totalInWords: 'mil doscientos diez euros',
        taxBreakdown: [{ rate: 21, base: 1000, tax: 210 }],
        billToAddress: 'Calle Ejemplo 42, 28001 Madrid',
        shipToAddress: 'Polígono Industrial Norte, Nave 5, 28100 Alcobendas',
        baseDocCode: null,
      },
      partner: {
        id: 'sample-partner',
        name: 'Cliente de Ejemplo S.L.',
        foreignName: null,
        taxId: 'B12345678',
        address: 'Av. Principal 1, 28001 Madrid, España',
        billingAddress: {
          street: 'Av. Principal 1',
          city: 'Madrid',
          state: null,
          zipCode: '28001',
          country: 'España',
        },
        shippingAddress: {
          street: 'Polígono Industrial Norte, Nave 5',
          city: 'Alcobendas',
          state: null,
          zipCode: '28100',
          country: 'España',
        },
        email: 'cliente@ejemplo.com',
        phone: '+34 900 000 000',
        website: 'https://ejemplo.com',
        priceListName: 'Tarifa General',
      },
      company: {
        name: 'Mi Empresa S.L.',
        taxId: 'A00000000',
        address: 'Calle Comercial 10, 28001 Madrid',
        phone: '+34 911 222 333',
        email: 'contacto@miempresa.com',
        website: 'https://miempresa.com',
        logoUrl: null,
      },
      lines: [
        {
          lineNum: 1,
          itemId: 'i1',
          itemCode: 'ART-001',
          itemName: 'Artículo de muestra 1',
          itemDescription: 'Descripción detallada del artículo',
          quantity: 2,
          uom: 'u',
          price: 250,
          taxRate: 21,
          lineTotal: 605,
          category: 'General',
        },
        {
          lineNum: 2,
          itemId: 'i2',
          itemCode: 'ART-002',
          itemName: 'Servicio profesional',
          itemDescription: null,
          quantity: 1,
          uom: 'h',
          price: 500,
          taxRate: 21,
          lineTotal: 605,
          category: 'Servicios',
        },
      ],
      generatedAt: new Date().toLocaleString('es-ES'),
    };
  }

  public static async findLatestSampleId(docType: DocType, db: any): Promise<string | null> {
    const map = TABLE_MAP[docType];
    if (!map) return null;
    const [row] = await db
      .select({ id: map.header.id })
      .from(map.header)
      .orderBy(desc(map.header.createdAt))
      .limit(1);
    return row?.id || null;
  }
}
