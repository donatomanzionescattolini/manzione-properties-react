import { useMemo } from 'react';
import { Building2, Users, DollarSign, AlertTriangle, Wrench } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDataStore } from '../../store/dataStore';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/layout/PageHeader';

// Stable date reference – sufficient for a dashboard loaded fresh each session.
const today = new Date();

export function Dashboard() {
  const { properties, tenants, payments, lateFees, maintenanceRequests } = useDataStore();


  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);

  const thisMonthPayments = payments.filter((p) => {
    const d = new Date(p.date);
    return d >= thisMonthStart && d <= thisMonthEnd && p.status === 'completed';
  });

  const rentCollected = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  const activeTenantsCount = tenants.filter((t) => t.status === 'active').length;
  const activeFees = lateFees.filter((f) => f.status === 'active');
  const totalLateFees = activeFees.reduce((sum, f) => sum + f.amount, 0);
  const openMaintenance = maintenanceRequests.filter(
    (r) => r.status !== 'completed' && r.status !== 'cancelled'
  );

  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(today, 5 - i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const total = payments
        .filter((p) => {
          const d = new Date(p.date);
          return d >= start && d <= end && p.status === 'completed';
        })
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        month: format(monthDate, 'MMM'),
        amount: total,
      };
    });
  }, [payments]);

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const pendingMaintenance = openMaintenance.slice(0, 5);

  const overdueMaintenanceCount = openMaintenance.filter((r) => {
    const daysOpen = Math.floor((today.getTime() - new Date(r.submittedDate).getTime()) / (1000 * 3600 * 24));
    return daysOpen > 3;
  }).length;

  const getTenantName = (tenantId: string) => {
    const t = tenants.find((x) => x.id === tenantId);
    return t ? `${t.firstName} ${t.lastName}` : 'Unknown';
  };

  const getPropertyAddress = (propertyId: string) => {
    const p = properties.find((x) => x.id === propertyId);
    return p ? p.address : 'Unknown';
  };

  const priorityColor: Record<string, string> = {
    low: 'badge-gray',
    medium: 'badge-yellow',
    high: 'badge-red',
    emergency: 'badge-red',
  };

  const statusColor: Record<string, string> = {
    pending: 'badge-yellow',
    assigned: 'badge-blue',
    'in-progress': 'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-gray',
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={format(today, "EEEE, MMMM d, yyyy")}
      />

      {overdueMaintenanceCount > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={24} />
            <div>
              <h3 className="text-red-800 font-bold text-sm">Reminders: Overdue Maintenance</h3>
              <p className="text-red-600 text-xs">You have {overdueMaintenanceCount} pending maintenance request(s) open for more than 3 days.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Properties"
          value={properties.length}
          icon={<Building2 size={20} />}
          color="blue"
          subtitle="Total active"
        />
        <StatCard
          title="Active Tenants"
          value={activeTenantsCount}
          icon={<Users size={20} />}
          color="green"
          subtitle="Currently leasing"
        />
        <StatCard
          title="Rent Collected"
          value={`$${rentCollected.toLocaleString()}`}
          icon={<DollarSign size={20} />}
          color="purple"
          subtitle="This month"
        />
        <StatCard
          title="Late Fees"
          value={`$${totalLateFees.toLocaleString()}`}
          icon={<AlertTriangle size={20} />}
          color="yellow"
          subtitle={`${activeFees.length} outstanding`}
        />
        <StatCard
          title="Maintenance"
          value={openMaintenance.length}
          icon={<Wrench size={20} />}
          color="red"
          subtitle="Open requests"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 page-card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Monthly Rent Collected
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Rent']}
              />
              <Bar dataKey="amount" fill="#1a3a52" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="page-card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Pending Maintenance
          </h2>
          {pendingMaintenance.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {pendingMaintenance.map((r) => (
                <div key={r.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                    <p className="text-xs text-gray-500">{getPropertyAddress(r.propertyId)}</p>
                  </div>
                  <span className={priorityColor[r.priority]}>{r.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="page-card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Payments</h2>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No payments recorded</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Tenant</th>
                <th className="table-th">Property</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Method</th>
                <th className="table-th">Date</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{getTenantName(p.tenantId)}</td>
                  <td className="table-td">{getPropertyAddress(p.propertyId)}</td>
                  <td className="table-td font-semibold text-green-700">
                    ${p.amount.toLocaleString()}
                  </td>
                  <td className="table-td capitalize">{p.method}</td>
                  <td className="table-td">{format(new Date(p.date), 'MMM d, yyyy')}</td>
                  <td className="table-td">
                    <span className={statusColor[p.status] || 'badge-gray'}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
