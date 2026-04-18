/**
 * Registro de módulos top-level del navbar.
 *
 * Cada módulo es un icono en el sidebar de 60px (IconSidebar). Cuando está activo,
 * la topbar (ModuleTabBar) muestra sus sub-tabs.
 *
 * Los plugins pueden:
 *   - Registrar sus propios módulos (manifest.ui.modules)
 *   - Inyectar sub-tabs en módulos existentes (manifest.ui.subTabs)
 *
 * El merge se hace en PluginContext.
 */

export interface SubTab {
  id: string;
  label: string;
  path: string;
  /** Nombre de un icono lucide-react. Opcional. */
  icon?: string;
}

export interface Module {
  id: string;
  label: string;
  /** Nombre de un icono lucide-react. */
  icon: string;
  subTabs: SubTab[];
}

export const CORE_MODULES: Module[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: 'Home',
    subTabs: [{ id: 'dashboard', label: 'Dashboard', path: '/' }],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: 'Package',
    subTabs: [
      { id: 'items', label: 'Catálogo', path: '/items' },
      { id: 'categories', label: 'Categorías', path: '/categories' },
      { id: 'uom', label: 'Unidades', path: '/uom' },
      { id: 'warehouses', label: 'Almacenes', path: '/warehouses' },
    ],
  },
  {
    id: 'sales',
    label: 'Ventas',
    icon: 'ShoppingCart',
    subTabs: [
      { id: 'sales-orders', label: 'Pedidos', path: '/sales-orders' },
      { id: 'sales-delivery-notes', label: 'Albaranes', path: '/sales/delivery-notes' },
      { id: 'sales-invoices', label: 'Facturas', path: '/sales/invoices' },
      { id: 'pricelists', label: 'Tarifas', path: '/pricelists' },
    ],
  },
  {
    id: 'purchases',
    label: 'Compras',
    icon: 'Truck',
    subTabs: [
      { id: 'purchase-orders', label: 'Pedidos', path: '/purchase-orders' },
      { id: 'purchase-delivery-notes', label: 'Albaranes', path: '/purchases/delivery-notes' },
      { id: 'purchase-invoices', label: 'Facturas', path: '/purchases/invoices' },
    ],
  },
  {
    id: 'partners',
    label: 'Interlocutores',
    icon: 'Users',
    subTabs: [
      { id: 'partners-list', label: 'Directorio', path: '/partners' },
      { id: 'partner-groups', label: 'Grupos', path: '/partner-groups' },
    ],
  },
  {
    id: 'accounting',
    label: 'Contabilidad',
    icon: 'Wallet',
    subTabs: [
      { id: 'periods', label: 'Periodos', path: '/accounting-periods' },
      { id: 'series', label: 'Series', path: '/document-series' },
      { id: 'taxes', label: 'Impuestos', path: '/taxes' },
      { id: 'templates', label: 'Plantillas PDF', path: '/document-templates' },
    ],
  },
  {
    id: 'plugins',
    label: 'Plugins',
    icon: 'Puzzle',
    subTabs: [{ id: 'plugins-manager', label: 'Gestor', path: '/plugins' }],
  },
  {
    id: 'settings',
    label: 'Ajustes',
    icon: 'Settings',
    subTabs: [
      { id: 'users', label: 'Usuarios', path: '/users' },
      { id: 'company', label: 'Empresa', path: '/settings/company' },
      { id: 'audit', label: 'Auditoría', path: '/audit-logs' },
      { id: 'styleguide', label: 'Style Guide', path: '/ui' },
    ],
  },
];

/**
 * Encuentra el módulo activo dado un pathname.
 * Hace match exacto primero, luego prefijo más largo.
 */
export function findActiveModule(modules: Module[], pathname: string): Module {
  // Match exacto en sub-tab path
  for (const m of modules) {
    if (m.subTabs.some((s) => s.path === pathname)) return m;
  }
  // Match por prefijo (ej: /items/abc-123 → catálogo)
  let best: { module: Module; depth: number } | null = null;
  for (const m of modules) {
    for (const s of m.subTabs) {
      if (s.path !== '/' && pathname.startsWith(s.path)) {
        const depth = s.path.length;
        if (!best || depth > best.depth) best = { module: m, depth };
      }
    }
  }
  if (best) return best.module;
  // Fallback al primer módulo (Home)
  return modules[0];
}
