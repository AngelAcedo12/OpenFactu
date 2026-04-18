import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Slot } from '../components/Slot';
import { Card, Badge, DashboardSkeleton } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFormat } from '../hooks/useFormat';
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  ChevronRight,
  CalendarDays,
  Truck,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardSummary {
  period: { id: string; code: string; name: string; startDate: string; endDate: string } | null;
  sales: { total: number; count: number; prevTotal: number; prevCount: number };
  purchases: { total: number; count: number; prevTotal: number; prevCount: number };
  receivables: { open: number; openCount: number };
  payables: { open: number; openCount: number };
  stockAlerts: {
    lowStock: { id: string; code: string; name: string; stock: number; minStock: number }[];
    expiringBatches: {
      id: string;
      batchNum: string;
      itemName: string;
      expiryDate: string;
      quantity: number;
    }[];
  };
  recentDocs: {
    type: string;
    route: string;
    id: string;
    code: string;
    date: string;
    total: number;
    partnerName: string;
    createdAt: string;
  }[];
  topPartners: {
    customers: { id: string; name: string; total: number }[];
    suppliers: { id: string; name: string; total: number }[];
  };
  monthlyTrend: { month: string; sales: number; purchases: number }[];
  invoiceStatus: { status: string; label: string; count: number }[];
}

const computeDelta = (current: number, previous: number) => {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  return Math.round(pct * 10) / 10;
};

const DOC_TYPE_LABELS: Record<string, string> = {
  salesInvoice: 'Factura venta',
  purchaseInvoice: 'Factura compra',
  salesDeliveryNote: 'Albarán venta',
  purchaseDeliveryNote: 'Albarán compra',
};
const DOC_TYPE_ICONS: Record<string, any> = {
  salesInvoice: FileText,
  purchaseInvoice: FileText,
  salesDeliveryNote: Truck,
  purchaseDeliveryNote: Truck,
};

const STATUS_COLORS: Record<string, string> = {
  Abiertas: '#f59e0b', // amber
  Cerradas: '#10b981', // emerald
  Parcial: '#3b82f6', // blue
  Anuladas: '#94a3b8', // slate
};

export const Dashboard: React.FC = () => {
  const { token, user } = useAuth();
  const { branding } = useTheme();
  const fmt = useFormat();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDark = branding.themeMode === 'dark';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  useEffect(() => {
    if (!user?.tenantId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/dashboard/summary', {
          headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': user?.tenantId || '' },
        });
        if (!res.ok) throw new Error('http');
        const json = await res.json();
        setData(json);
        setError(null);
      } catch {
        setError('No se pudo cargar el resumen');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.tenantId, token]);

  const monthlyData = useMemo(() => {
    if (!data?.monthlyTrend) return [];
    return data.monthlyTrend.map((m) => {
      const [y, mo] = m.month.split('-');
      const d = new Date(Number(y), Number(mo) - 1, 1);
      return {
        month: d.toLocaleDateString('es-ES', { month: 'short' }),
        Ventas: m.sales,
        Compras: m.purchases,
      };
    });
  }, [data]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        {error || 'Sin datos disponibles'}
      </div>
    );
  }

  const salesDelta = computeDelta(data.sales.total, data.sales.prevTotal);
  const purchasesDelta = computeDelta(data.purchases.total, data.purchases.prevTotal);

  const periodLabel = data.period
    ? `${data.period.name} · ${fmt.date(data.period.startDate)} – ${fmt.date(data.period.endDate)}`
    : 'Sin periodo activo';

  const topCustomersBars = data.topPartners.customers.map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 16) + '…' : c.name,
    total: c.total,
  }));
  const topSuppliersBars = data.topPartners.suppliers.map((s) => ({
    name: s.name.length > 18 ? s.name.slice(0, 16) + '…' : s.name,
    total: s.total,
  }));

  return (
    <div className="p-4 w-full space-y-6 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter font-display">
            Business Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm flex items-center gap-2">
            <CalendarDays size={14} className="text-slate-400 dark:text-slate-400" />
            {periodLabel}
          </p>
        </div>
        <Badge variant="success" className="px-3 py-1 text-[10px] font-black uppercase">
          Sistema Sincronizado
        </Badge>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ventas del periodo"
          value={fmt.money(data.sales.total)}
          subtitle={`${data.sales.count} facturas`}
          delta={salesDelta}
          icon={TrendingUp}
          color="text-emerald-600 dark:text-emerald-300"
          bg="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <KpiCard
          label="Compras del periodo"
          value={fmt.money(data.purchases.total)}
          subtitle={`${data.purchases.count} facturas`}
          delta={purchasesDelta}
          icon={TrendingDown}
          color="text-blue-600 dark:text-blue-300"
          bg="bg-blue-50 dark:bg-blue-500/10"
        />
        <KpiCard
          label="Cobros pendientes"
          value={fmt.money(data.receivables.open)}
          subtitle={`${data.receivables.openCount} facturas abiertas`}
          icon={ArrowDownLeft}
          color="text-indigo-600 dark:text-indigo-300"
          bg="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <KpiCard
          label="Pagos pendientes"
          value={fmt.money(data.payables.open)}
          subtitle={`${data.payables.openCount} facturas abiertas`}
          icon={ArrowUpRight}
          color="text-rose-600 dark:text-rose-300"
          bg="bg-rose-50 dark:bg-rose-500/10"
        />
      </div>

      {/* Línea: tendencia mensual + Donut: estado de facturas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          className="lg:col-span-2"
          title="Tendencia 12 meses"
          subtitle="Ventas vs compras facturadas."
        >
          <div className="h-72 -ml-2">
            {monthlyData.every((m) => m.Ventas === 0 && m.Compras === 0) ? (
              <EmptyState
                icon={TrendingUp}
                title="Sin datos"
                hint="Aún no hay facturas para mostrar."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke={axisColor} fontSize={11} />
                  <YAxis
                    stroke={axisColor}
                    fontSize={11}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: isDark ? '#0f172a' : '#fff',
                      border: `1px solid ${gridColor}`,
                      borderRadius: 8,
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmt.money(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="Ventas"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Compras"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Estado de facturas" subtitle="Distribución global.">
          <div className="h-72">
            {data.invoiceStatus.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Sin facturas"
                hint="Todavía no hay facturas registradas."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.invoiceStatus}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {data.invoiceStatus.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={STATUS_COLORS[entry.label] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: isDark ? '#0f172a' : '#fff',
                      border: `1px solid ${gridColor}`,
                      borderRadius: 8,
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Barras: top clientes y proveedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top clientes" subtitle="Mayor facturación del periodo.">
          <div className="h-64">
            {topCustomersBars.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="Sin clientes"
                hint="Aún no hay facturación de clientes."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomersBars} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={axisColor}
                    fontSize={10}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke={axisColor}
                    fontSize={11}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      background: isDark ? '#0f172a' : '#fff',
                      border: `1px solid ${gridColor}`,
                      borderRadius: 8,
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmt.money(v)}
                  />
                  <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Top proveedores" subtitle="Mayor compra del periodo.">
          <div className="h-64">
            {topSuppliersBars.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="Sin proveedores"
                hint="Aún no hay facturación de proveedores."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSuppliersBars} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={axisColor}
                    fontSize={10}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke={axisColor}
                    fontSize={11}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      background: isDark ? '#0f172a' : '#fff',
                      border: `1px solid ${gridColor}`,
                      borderRadius: 8,
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmt.money(v)}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Documentos recientes + alertas de stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          className="lg:col-span-2"
          title="Documentos recientes"
          subtitle="Últimas facturas y albaranes registrados."
        >
          {data.recentDocs.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Sin documentos"
              hint="Crea una factura o un albarán para verlo aquí."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentDocs.map((d) => {
                const Icon = DOC_TYPE_ICONS[d.type] || FileText;
                return (
                  <li key={`${d.type}-${d.id}`}>
                    <button
                      onClick={() => navigate(d.route)}
                      className="w-full flex items-center gap-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 transition-colors text-left"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wide">
                          {DOC_TYPE_LABELS[d.type] || d.type}
                        </p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {d.code}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {d.partnerName || '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {fmt.money(d.total)}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-400">
                          {fmt.date(d.date)}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 dark:text-slate-300" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Stock crítico" subtitle="Artículos por debajo del mínimo.">
            {data.stockAlerts.lowStock.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Sin alertas"
                hint="Todos los stocks están en orden."
              />
            ) : (
              <ul className="space-y-2">
                {data.stockAlerts.lowStock.map((it) => (
                  <li key={it.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {it.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400">{it.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-600 dark:text-rose-300">
                        {Number(it.stock).toFixed(2)}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400">
                        min {Number(it.minStock).toFixed(2)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Lotes próximos a caducar" subtitle="Próximos 30 días.">
            {data.stockAlerts.expiringBatches.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="Sin caducidades"
                hint="Ningún lote a punto de caducar."
              />
            ) : (
              <ul className="space-y-2">
                {data.stockAlerts.expiringBatches.map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {b.itemName}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400">
                        Lote {b.batchNum}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-600 dark:text-amber-300">
                        {fmt.date(b.expiryDate)}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400">
                        {Number(b.quantity).toFixed(2)} ud
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Slot name="dashboard:main:bottom" />
    </div>
  );
};

interface KpiCardProps {
  label: string;
  value: string;
  subtitle: string;
  delta?: number | null;
  icon: any;
  color: string;
  bg: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtitle,
  delta,
  icon: Icon,
  color,
  bg,
}) => {
  const deltaColor =
    delta == null
      ? 'text-slate-400 dark:text-slate-400'
      : delta >= 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-600 dark:text-rose-400';
  const DeltaIcon = delta == null ? Clock : delta >= 0 ? ArrowUpRight : ArrowDownLeft;
  return (
    <Card className="relative group transition-all">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-widest leading-none mb-2">
            {label}
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter truncate">
            {value}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          <p className={`text-[11px] font-bold mt-2 flex items-center gap-1 ${deltaColor}`}>
            <DeltaIcon size={12} />
            {delta == null ? 'sin comparativa' : `${delta > 0 ? '+' : ''}${delta}% vs anterior`}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${bg} ${color} shadow-inner`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
};

const EmptyState: React.FC<{ icon: any; title: string; hint: string }> = ({
  icon: Icon,
  title,
  hint,
}) => (
  <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
    <div className="mx-auto w-12 h-12 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-300">
      <Icon size={20} />
    </div>
    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</p>
    <p className="text-xs text-slate-400 dark:text-slate-400">{hint}</p>
  </div>
);
