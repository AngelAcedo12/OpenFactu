import { DocumentEngine, type DocumentCreateRequest } from '../documents/DocumentEngine';
import { PluginFieldManager } from './PluginFieldManager';
import { ClientFactory } from '../tenant/ClientFactory';
import { AuthService } from '../auth/AuthService';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as schema from '../../db/schema';
type DocType = 'SINV' | 'PINV' | 'SO' | 'PO' | 'SDN' | 'PDN';

/**
 * Línea de un documento DI API.
 */
interface DiLine {
  itemId: string;
  quantity: number;
  price: number;
  taxGroupId: string;
  warehouseId?: string;
  zoneId?: string;
  uomId?: string;
  uomFactor?: number;
  batchDetails?: Array<{ batchNum: string; quantity: number; expiryDate?: Date; zoneId?: string }>;
  pluginData?: Record<string, any>;
  [key: string]: any;
}

/**
 * Clase base para todos los objetos de negocio de tipo Documento.
 * Los tipos concretos (SalesInvoice, PurchaseOrder, etc.) heredan de aquí
 * y sólo definen su configuración — toda la lógica la comparten.
 *
 * Uso (desde un plugin):
 *   const inv = diApi.salesInvoice();
 *   inv.partnerId = '...';
 *   inv.addLine({ itemId: '...', quantity: 5, price: 100 });
 *   const result = await inv.save();
 *
 * Uso (desde la DI REST API):
 *   POST /api/di/documents/SINV → internamente crea una instancia y llama save()
 */
export abstract class DiDocument {
  /** ID del documento — se asigna al crear la instancia, antes de save(). */
  readonly id: string = crypto.randomUUID();

  partnerId = '';
  seriesId = '';
  periodId = '';
  date: Date | string = new Date();
  warehouseId?: string;
  billToAddress?: string;
  shipToAddress?: string;
  deliveryDate?: Date | string;
  orderId?: string;
  customFields: Record<string, any> = {};
  protected _lines: DiLine[] = [];

  abstract readonly docType: DocType;
  abstract readonly tableName: string;
  abstract readonly schemaTable: any;
  abstract readonly lineSchemaTable: any;
  abstract readonly batchSchemaTable: any | null;
  abstract readonly eventPrefix: string;
  abstract readonly stockAction: 'IN' | 'OUT' | 'NONE';
  abstract readonly closeBaseDocuments: boolean;
  abstract readonly initialStatus: string;

  addLine(line: DiLine): this {
    this._lines.push(line);
    return this;
  }

  get lines(): readonly DiLine[] {
    return this._lines;
  }

  /**
   * Construye el request body para DocumentEngine.create
   */
  toCreateRequest(): DocumentCreateRequest & Record<string, any> {
    return {
      id: this.id,
      seriesId: this.seriesId,
      periodId: this.periodId,
      partnerId: this.partnerId,
      date: this.date,
      warehouseId: this.warehouseId,
      billToAddress: this.billToAddress,
      shipToAddress: this.shipToAddress,
      deliveryDate: this.deliveryDate,
      orderId: this.orderId,
      lines: this._lines,
      ...this.customFields,
    };
  }

  /**
   * Guarda el documento en la base de datos usando DocumentEngine.
   */
  async save(tenantId: string, db: any, user: any): Promise<{ id: string; docNum: number }> {
    const pluginFields = await PluginFieldManager.validateAndExtract(
      this.eventPrefix.charAt(0).toUpperCase() + this.eventPrefix.slice(1),
      this.customFields,
      tenantId,
    );

    const request = this.toCreateRequest();
    Object.assign(request, pluginFields);

    return DocumentEngine.create(tenantId, db, user, {
      tableName: this.tableName,
      schemaTable: this.schemaTable,
      lineSchemaTable: this.lineSchemaTable,
      batchSchemaTable: this.batchSchemaTable,
      eventPrefix: this.eventPrefix,
      stockAction: this.stockAction,
      closeBaseDocuments: this.closeBaseDocuments,
      initialStatus: this.initialStatus,
    }, request);
  }

  /**
   * Rellena desde un body JSON (REST API).
   */
  fromBody(body: any): this {
    if (body.partnerId) this.partnerId = body.partnerId;
    if (body.seriesId) this.seriesId = body.seriesId;
    if (body.periodId) this.periodId = body.periodId;
    if (body.date) this.date = body.date;
    if (body.warehouseId) this.warehouseId = body.warehouseId;
    if (body.billToAddress) this.billToAddress = body.billToAddress;
    if (body.shipToAddress) this.shipToAddress = body.shipToAddress;
    if (body.deliveryDate) this.deliveryDate = body.deliveryDate;
    if (body.orderId) this.orderId = body.orderId;
    if (body.customFields) this.customFields = body.customFields;
    if (Array.isArray(body.lines)) {
      for (const l of body.lines) this.addLine(l);
    }
    return this;
  }
}

// ============================================================
//  Implementaciones concretas — una por tipo de documento
// ============================================================

export class SalesInvoice extends DiDocument {
  readonly docType: DocType = 'SINV';
  readonly tableName = 'salesInvoices';
  readonly schemaTable = schema.salesInvoices;
  readonly lineSchemaTable = schema.salesInvoiceLines;
  readonly batchSchemaTable = schema.salesInvoiceLineBatches;
  readonly eventPrefix = 'salesInvoice';
  readonly stockAction = 'OUT' as const;
  readonly closeBaseDocuments = true;
  readonly initialStatus = 'D';
}

export class PurchaseInvoice extends DiDocument {
  readonly docType: DocType = 'PINV';
  readonly tableName = 'purchaseInvoices';
  readonly schemaTable = schema.purchaseInvoices;
  readonly lineSchemaTable = schema.purchaseInvoiceLines;
  readonly batchSchemaTable = schema.purchaseInvoiceLineBatches;
  readonly eventPrefix = 'purchaseInvoice';
  readonly stockAction = 'IN' as const;
  readonly closeBaseDocuments = true;
  readonly initialStatus = 'D';
}

export class SalesOrder extends DiDocument {
  readonly docType: DocType = 'SO';
  readonly tableName = 'salesOrders';
  readonly schemaTable = schema.salesOrders;
  readonly lineSchemaTable = schema.salesOrderLines;
  readonly batchSchemaTable = null;
  readonly eventPrefix = 'salesOrder';
  readonly stockAction = 'NONE' as const;
  readonly closeBaseDocuments = false;
  readonly initialStatus = 'O';
}

export class PurchaseOrder extends DiDocument {
  readonly docType: DocType = 'PO';
  readonly tableName = 'purchaseOrders';
  readonly schemaTable = schema.purchaseOrders;
  readonly lineSchemaTable = schema.purchaseOrderLines;
  readonly batchSchemaTable = null;
  readonly eventPrefix = 'purchaseOrder';
  readonly stockAction = 'NONE' as const;
  readonly closeBaseDocuments = false;
  readonly initialStatus = 'O';
}

export class SalesDeliveryNote extends DiDocument {
  readonly docType: DocType = 'SDN';
  readonly tableName = 'salesDeliveryNotes';
  readonly schemaTable = schema.salesDeliveryNotes;
  readonly lineSchemaTable = schema.salesDeliveryNoteLines;
  readonly batchSchemaTable = schema.salesDeliveryNoteLineBatches;
  readonly eventPrefix = 'salesDeliveryNote';
  readonly stockAction = 'OUT' as const;
  readonly closeBaseDocuments = false;
  readonly initialStatus = 'O';
}

export class PurchaseDeliveryNote extends DiDocument {
  readonly docType: DocType = 'PDN';
  readonly tableName = 'purchaseDeliveryNotes';
  readonly schemaTable = schema.purchaseDeliveryNotes;
  readonly lineSchemaTable = schema.purchaseDeliveryNoteLines;
  readonly batchSchemaTable = schema.purchaseDeliveryNoteLineBatches;
  readonly eventPrefix = 'purchaseDeliveryNote';
  readonly stockAction = 'IN' as const;
  readonly closeBaseDocuments = false;
  readonly initialStatus = 'O';
}

// ============================================================
//  Factory — punto de entrada para crear cualquier documento
// ============================================================

const DOC_CLASSES: Record<DocType, new () => DiDocument> = {
  SINV: SalesInvoice,
  PINV: PurchaseInvoice,
  SO: SalesOrder,
  PO: PurchaseOrder,
  SDN: SalesDeliveryNote,
  PDN: PurchaseDeliveryNote,
};

/**
 * Contexto transaccional de FactuAPI.
 * Permite crear y guardar documentos dentro de una misma transacción de BD,
 * y expone helpers para consultar datos del tenant.
 */
export class FactuApiTransaction {
  constructor(
    private _tenantId: string,
    private _db: any,
    private _user: any,
  ) {}

  get tenantId() { return this._tenantId; }
  get db() { return this._db; }
  get user() { return this._user; }

  // ── Factory de documentos ──────────────────────────────────
  salesInvoice(): SalesInvoice { return new SalesInvoice(); }
  purchaseInvoice(): PurchaseInvoice { return new PurchaseInvoice(); }
  salesOrder(): SalesOrder { return new SalesOrder(); }
  purchaseOrder(): PurchaseOrder { return new PurchaseOrder(); }
  salesDeliveryNote(): SalesDeliveryNote { return new SalesDeliveryNote(); }
  purchaseDeliveryNote(): PurchaseDeliveryNote { return new PurchaseDeliveryNote(); }
  create(docType: DocType): DiDocument {
    const Cls = DOC_CLASSES[docType];
    if (!Cls) throw new Error(`Tipo de documento no soportado en FactuAPI: ${docType}`);
    return new Cls();
  }

  // ── Persistencia (usa la tx actual) ────────────────────────
  async save(doc: DiDocument): Promise<{ id: string; docNum: number }> {
    return doc.save(this._tenantId, this._db, this._user);
  }

  // ── Helpers de consulta ────────────────────────────────────
  async getPartner(id: string) {
    const [p] = await this._db.select().from(schema.businessPartners).where(eq(schema.businessPartners.id, id));
    return p || null;
  }

  async getItem(idOrCode: string) {
    const [byId] = await this._db.select().from(schema.items).where(eq(schema.items.id, idOrCode));
    if (byId) return byId;
    const [byCode] = await this._db.select().from(schema.items).where(eq(schema.items.code, idOrCode));
    return byCode || null;
  }

  async getSeries(docType: string) {
    return this._db.select().from(schema.documentSeries).where(eq(schema.documentSeries.docType, docType));
  }

  async getOpenPeriods() {
    return this._db.select().from(schema.accountingPeriods).where(eq(schema.accountingPeriods.status, 'O'));
  }
}

/**
 * Factory principal de FactuAPI.
 *
 *   const doc = FactuApi.create('SINV');
 *   doc.partnerId = '...';
 *   doc.addLine({ ... });
 *   await doc.save(tenantId, db, user);
 *
 * Transacción atómica:
 *   await FactuApi.transaction(tenantId, db, user, async (tx) => {
 *     const sdn = tx.salesDeliveryNote();
 *     sdn.partnerId = '...';
 *     sdn.addLine({ ... });
 *     await tx.save(sdn);
 *
 *     const inv = tx.salesInvoice();
 *     inv.addLine({ baseType: 'SDN', baseId: sdn.id, ... });
 *     await tx.save(inv);
 *   });
 */
export class FactuApi {
  static create(docType: DocType): DiDocument {
    const Cls = DOC_CLASSES[docType];
    if (!Cls) throw new Error(`Tipo de documento no soportado en FactuAPI: ${docType}`);
    return new Cls();
  }

  static salesInvoice(): SalesInvoice { return new SalesInvoice(); }
  static purchaseInvoice(): PurchaseInvoice { return new PurchaseInvoice(); }
  static salesOrder(): SalesOrder { return new SalesOrder(); }
  static purchaseOrder(): PurchaseOrder { return new PurchaseOrder(); }
  static salesDeliveryNote(): SalesDeliveryNote { return new SalesDeliveryNote(); }
  static purchaseDeliveryNote(): PurchaseDeliveryNote { return new PurchaseDeliveryNote(); }

  /**
   * Ejecuta un callback dentro de una transacción de BD.
   * Si el callback lanza un error, se hace rollback de todo.
   */
  static async transaction<T>(
    tenantId: string,
    db: any,
    user: any,
    fn: (tx: FactuApiTransaction) => Promise<T>,
  ): Promise<T> {
    return db.transaction(async (txClient: any) => {
      const txApi = new FactuApiTransaction(tenantId, txClient, user);
      return fn(txApi);
    });
  }

  /**
   * Conecta a la BD de un tenant para consultas (sin transacción explícita).
   */
  static connect(tenantId: string, db: any, user: any): FactuApiTransaction {
    return new FactuApiTransaction(tenantId, db, user);
  }

  // ── Tenant & Auth ──────────────────────────────────────────

  /**
   * Lista todos los tenants disponibles.
   *
   *   const tenants = await FactuApi.getTenants();
   *   // [{ id: 'abc-123', name: 'Mi Empresa', schemaName: 'tenant_mi_empresa' }, ...]
   */
  static async getTenants() {
    const publicDb = ClientFactory.getClient('public');
    return publicDb.select().from(schema.tenants);
  }

  /**
   * Obtiene un tenant por ID.
   *
   *   const tenant = await FactuApi.getTenant('abc-123');
   */
  static async getTenant(tenantId: string) {
    const publicDb = ClientFactory.getClient('public');
    const [tenant] = await publicDb
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));
    return tenant || null;
  }

  /**
   * Busca un tenant por nombre.
   *
   *   const tenant = await FactuApi.getTenantByName('Mi Empresa');
   */
  static async getTenantByName(name: string) {
    const publicDb = ClientFactory.getClient('public');
    const [tenant] = await publicDb
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.name, name));
    return tenant || null;
  }

  /**
   * Obtiene el cliente de BD para un tenant (resuelve tenantId → schema → drizzle client).
   *
   *   const db = await FactuApi.getTenantDb('abc-123');
   *   // Ahora puedes usar: FactuApi.connect('abc-123', db, user)
   */
  static async getTenantDb(tenantId: string) {
    return ClientFactory.getTenantClient(tenantId);
  }

  /**
   * Autentica un usuario por email/username y password.
   * Devuelve el usuario y los tenants a los que tiene acceso.
   *
   *   const session = await FactuApi.login('admin@openfactu.com', 'admin123');
   *   // session.user     → { id, email, username, role }
   *   // session.tenants  → [{ tenantId, tenantName, role, permissions }]
   *   // session.token    → JWT string
   */
  static async login(emailOrUsername: string, password: string) {
    const publicDb = ClientFactory.getClient('public');

    // Buscar usuario por email o username
    const [byEmail] = await publicDb
      .select()
      .from(schema.globalUsers)
      .where(eq(schema.globalUsers.email, emailOrUsername));
    const [byUsername] = !byEmail
      ? await publicDb
          .select()
          .from(schema.globalUsers)
          .where(eq(schema.globalUsers.username, emailOrUsername))
      : [byEmail];

    const user = byEmail || byUsername;
    if (!user) throw new Error('Usuario no encontrado');

    const valid = await AuthService.verifyPassword(password, user.password);
    if (!valid) throw new Error('Contraseña incorrecta');

    // Resolver tenants accesibles
    let accessibleTenants: Array<{ tenantId: string; tenantName: string; role: string; permissions: any }> = [];

    if (user.role === 'SUPERUSER') {
      // Superuser accede a todo
      const allTenants = await publicDb.select().from(schema.tenants);
      accessibleTenants = allTenants.map((t: any) => ({
        tenantId: t.id,
        tenantName: t.name,
        role: 'SUPERUSER',
        permissions: null,
      }));
    } else {
      // Buscar membresías
      const memberships = await publicDb
        .select()
        .from(schema.userTenantMemberships)
        .where(eq(schema.userTenantMemberships.userId, user.id));

      if (memberships.length > 0) {
        const allTenants = await publicDb.select().from(schema.tenants);
        const tenantMap = new Map(allTenants.map((t: any) => [t.id, t]));

        accessibleTenants = memberships.map((m: any) => ({
          tenantId: m.tenantId,
          tenantName: (tenantMap.get(m.tenantId) as any)?.name || 'Unknown',
          role: m.role,
          permissions: m.permissions ? JSON.parse(m.permissions) : null,
        }));
      } else if (user.tenantId) {
        // Fallback legacy: user.tenantId directo
        const tenant = await FactuApi.getTenant(user.tenantId);
        if (tenant) {
          accessibleTenants = [{
            tenantId: tenant.id,
            tenantName: tenant.name,
            role: user.role,
            permissions: user.permissions ? JSON.parse(user.permissions) : null,
          }];
        }
      }
    }

    // Generar token JWT (con el primer tenant por defecto)
    const defaultTenantId = accessibleTenants[0]?.tenantId || null;
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      tenantId: defaultTenantId,
    });

    return {
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
      tenants: accessibleTenants,
      token,
    };
  }

  /**
   * Flujo completo: login + seleccionar tenant + obtener conexión lista para operar.
   *
   *   const ctx = await FactuApi.session('admin@openfactu.com', 'admin123', 'Mi Empresa');
   *   // ctx.tenantId  → 'abc-123'
   *   // ctx.db        → drizzle client del tenant
   *   // ctx.user      → { id, email, username, role }
   *   // ctx.api       → FactuApiTransaction lista para usar
   *
   *   // Crear factura directamente:
   *   const inv = ctx.api.salesInvoice();
   *   inv.partnerId = '...';
   *   await ctx.api.save(inv);
   *
   *   // O usar transacción:
   *   await FactuApi.transaction(ctx.tenantId, ctx.db, ctx.user, async (tx) => { ... });
   */
  static async session(emailOrUsername: string, password: string, tenantName?: string) {
    const loginResult = await FactuApi.login(emailOrUsername, password);

    if (loginResult.tenants.length === 0) {
      throw new Error('El usuario no tiene acceso a ningún tenant');
    }

    // Seleccionar tenant por nombre o usar el primero
    let selected = loginResult.tenants[0];
    if (tenantName) {
      const found = loginResult.tenants.find(
        (t) => t.tenantName.toLowerCase() === tenantName.toLowerCase(),
      );
      if (!found) {
        const available = loginResult.tenants.map((t) => t.tenantName).join(', ');
        throw new Error(`Tenant "${tenantName}" no accesible. Disponibles: ${available}`);
      }
      selected = found;
    }

    const db = await FactuApi.getTenantDb(selected.tenantId);
    const user = { ...loginResult.user, tenantId: selected.tenantId };
    const api = new FactuApiTransaction(selected.tenantId, db, user);

    return {
      tenantId: selected.tenantId,
      tenantName: selected.tenantName,
      db,
      user,
      token: loginResult.token,
      api,
    };
  }

  /**
   * Cierra todas las conexiones. Llamar al finalizar la aplicación.
   */
  static async disconnect() {
    await ClientFactory.disconnectAll();
  }
}
