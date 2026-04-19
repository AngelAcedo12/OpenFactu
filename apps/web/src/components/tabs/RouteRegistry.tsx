import React from 'react';
import { matchRoutes } from 'react-router-dom';
import { Dashboard } from '../../pages/Dashboard';
import { StyleGuide } from '../../pages/StyleGuide';
import { PluginManager } from '../../pages/PluginManager';
import { Users } from '../../pages/Users';
import { Items } from '../../pages/Items';
import { Categories } from '../../pages/Categories';
import { Uom } from '../../pages/Uom';
import { PriceLists } from '../../pages/PriceLists';
import { Warehouses } from '../../pages/Warehouses';
import { Partners } from '../../pages/Partners';
import { PartnerGroups } from '../../pages/PartnerGroups';
import { AccountingPeriods } from '../../pages/AccountingPeriods';
import { DocumentSeries } from '../../pages/DocumentSeries';
import { PurchaseOrders } from '../../pages/PurchaseOrders';
import { PurchaseDeliveryNotes } from '../../pages/PurchaseDeliveryNotes';
import { PurchaseInvoices } from '../../pages/PurchaseInvoices';
import { SalesOrders } from '../../pages/SalesOrders';
import { SalesDeliveryNotes } from '../../pages/SalesDeliveryNotes';
import { SalesInvoices } from '../../pages/SalesInvoices';
import { Taxes } from '../../pages/Taxes';
import { AuditLogs } from '../../pages/AuditLogs';
import { DocumentTemplates } from '../../pages/DocumentTemplates';
import { DocumentTemplateDesigner } from '../../pages/DocumentTemplateDesigner';
import { CompanySettings } from '../../pages/CompanySettings';
import { NewCompany } from '../../pages/NewCompany';
import { ServerCockpit } from '../../pages/ServerCockpit';

export interface RouteMeta {
  title: string;
  iconName?: string;
  permissionPath?: string;
}

export interface RouteEntry extends RouteMeta {
  pattern: string;
  Component: React.ComponentType;
}

export const staticRoutes: RouteEntry[] = [
  { pattern: '/', Component: Dashboard, title: 'Dashboard', iconName: 'BarChart3' },
  {
    pattern: '/plugins',
    Component: PluginManager,
    title: 'Plugins',
    iconName: 'Layers',
    permissionPath: '/plugins',
  },
  {
    pattern: '/users',
    Component: Users,
    title: 'Usuarios',
    iconName: 'Users',
    permissionPath: '/users',
  },
  {
    pattern: '/audit-logs',
    Component: AuditLogs,
    title: 'Auditoría',
    iconName: 'ClipboardList',
    permissionPath: '/audit-logs',
  },
  {
    pattern: '/pricelists',
    Component: PriceLists,
    title: 'Tarifas',
    iconName: 'Zap',
    permissionPath: '/pricelists',
  },
  {
    pattern: '/items',
    Component: Items,
    title: 'Catálogo',
    iconName: 'Grid',
    permissionPath: '/items',
  },
  {
    pattern: '/categories',
    Component: Categories,
    title: 'Categorías',
    iconName: 'Hash',
    permissionPath: '/categories',
  },
  {
    pattern: '/warehouses',
    Component: Warehouses,
    title: 'Gestión Bins',
    iconName: 'MapPin',
    permissionPath: '/warehouses',
  },
  { pattern: '/uom', Component: Uom, title: 'Unidades', iconName: 'Boxes', permissionPath: '/uom' },
  {
    pattern: '/purchase-orders',
    Component: PurchaseOrders,
    title: 'Pedidos Compra',
    iconName: 'FileDigit',
    permissionPath: '/purchase-orders',
  },
  {
    pattern: '/purchase-orders/new',
    Component: PurchaseOrders,
    title: 'Nuevo Pedido Compra',
    iconName: 'FileDigit',
    permissionPath: '/purchase-orders',
  },
  {
    pattern: '/purchase-orders/:id',
    Component: PurchaseOrders,
    title: 'Pedido Compra',
    iconName: 'FileDigit',
    permissionPath: '/purchase-orders',
  },
  {
    pattern: '/purchases/delivery-notes',
    Component: PurchaseDeliveryNotes,
    title: 'Albaranes Compra',
    iconName: 'Truck',
    permissionPath: '/purchases/delivery-notes',
  },
  {
    pattern: '/purchases/delivery-notes/new',
    Component: PurchaseDeliveryNotes,
    title: 'Nuevo Albarán Compra',
    iconName: 'Truck',
    permissionPath: '/purchases/delivery-notes',
  },
  {
    pattern: '/purchases/delivery-notes/:id',
    Component: PurchaseDeliveryNotes,
    title: 'Albarán Compra',
    iconName: 'Truck',
    permissionPath: '/purchases/delivery-notes',
  },
  {
    pattern: '/purchases/invoices',
    Component: PurchaseInvoices,
    title: 'Facturas Compra',
    iconName: 'FileStack',
    permissionPath: '/purchases/invoices',
  },
  {
    pattern: '/purchases/invoices/new',
    Component: PurchaseInvoices,
    title: 'Nueva Factura Compra',
    iconName: 'FileStack',
    permissionPath: '/purchases/invoices',
  },
  {
    pattern: '/purchases/invoices/:id',
    Component: PurchaseInvoices,
    title: 'Factura Compra',
    iconName: 'FileStack',
    permissionPath: '/purchases/invoices',
  },
  {
    pattern: '/sales-orders',
    Component: SalesOrders,
    title: 'Pedidos Venta',
    iconName: 'FileDigit',
    permissionPath: '/sales-orders',
  },
  {
    pattern: '/sales-orders/new',
    Component: SalesOrders,
    title: 'Nuevo Pedido Venta',
    iconName: 'FileDigit',
    permissionPath: '/sales-orders',
  },
  {
    pattern: '/sales-orders/:id',
    Component: SalesOrders,
    title: 'Pedido Venta',
    iconName: 'FileDigit',
    permissionPath: '/sales-orders',
  },
  {
    pattern: '/sales/delivery-notes',
    Component: SalesDeliveryNotes,
    title: 'Albaranes Venta',
    iconName: 'Truck',
    permissionPath: '/sales/delivery-notes',
  },
  {
    pattern: '/sales/delivery-notes/new',
    Component: SalesDeliveryNotes,
    title: 'Nuevo Albarán Venta',
    iconName: 'Truck',
    permissionPath: '/sales/delivery-notes',
  },
  {
    pattern: '/sales/delivery-notes/:id',
    Component: SalesDeliveryNotes,
    title: 'Albarán Venta',
    iconName: 'Truck',
    permissionPath: '/sales/delivery-notes',
  },
  {
    pattern: '/sales/invoices',
    Component: SalesInvoices,
    title: 'Facturas Venta',
    iconName: 'FileStack',
    permissionPath: '/sales/invoices',
  },
  {
    pattern: '/sales/invoices/new',
    Component: SalesInvoices,
    title: 'Nueva Factura Venta',
    iconName: 'FileStack',
    permissionPath: '/sales/invoices',
  },
  {
    pattern: '/sales/invoices/:id',
    Component: SalesInvoices,
    title: 'Factura Venta',
    iconName: 'FileStack',
    permissionPath: '/sales/invoices',
  },
  {
    pattern: '/partner-groups',
    Component: PartnerGroups,
    title: 'Grupos',
    iconName: 'Network',
    permissionPath: '/partner-groups',
  },
  {
    pattern: '/partners',
    Component: Partners,
    title: 'Directorio',
    iconName: 'Users',
    permissionPath: '/partners',
  },
  {
    pattern: '/accounting-periods',
    Component: AccountingPeriods,
    title: 'Periodos',
    iconName: 'Calendar',
    permissionPath: '/accounting-periods',
  },
  {
    pattern: '/taxes',
    Component: Taxes,
    title: 'Impuestos',
    iconName: 'Percent',
    permissionPath: '/taxes',
  },
  {
    pattern: '/document-series',
    Component: DocumentSeries,
    title: 'Series Doc.',
    iconName: 'FileDigit',
    permissionPath: '/document-series',
  },
  {
    pattern: '/document-templates',
    Component: DocumentTemplates,
    title: 'Plantillas PDF',
    iconName: 'FileCode',
    permissionPath: '/document-templates',
  },
  {
    pattern: '/document-templates/:id/designer',
    Component: DocumentTemplateDesigner,
    title: 'Diseñador de plantilla',
    iconName: 'FileCode',
    permissionPath: '/document-templates',
  },
  {
    pattern: '/settings/company',
    Component: CompanySettings,
    title: 'Empresa',
    iconName: 'Building',
    permissionPath: '/settings/company',
  },
  {
    pattern: '/companies/new',
    Component: NewCompany,
    title: 'Nueva Empresa',
    iconName: 'Building',
    permissionPath: '/companies/new',
  },
  {
    pattern: '/system/cockpit',
    Component: ServerCockpit,
    title: 'Cockpit',
    iconName: 'Activity',
    permissionPath: '/system/cockpit',
  },
  {
    pattern: '/ui',
    Component: StyleGuide,
    title: 'Dev Console',
    iconName: 'Terminal',
    permissionPath: '/ui',
  },
];

const matchCandidates = staticRoutes.map((r) => ({ path: r.pattern }));

export function resolveRouteMeta(pathname: string): RouteMeta | null {
  const matches = matchRoutes(matchCandidates, pathname);
  if (!matches || matches.length === 0) return null;
  const matched = matches[0].route;
  const entry = staticRoutes.find((r) => r.pattern === matched.path);
  if (!entry) return null;
  return { title: entry.title, iconName: entry.iconName, permissionPath: entry.permissionPath };
}
