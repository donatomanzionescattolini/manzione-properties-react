import { format } from 'date-fns';
import { CreditCard, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';

export function TenantHome() {
  const { currentUser } = useAuthStore();
  const { tenants, properties, payments, maintenanceRequests, lateFees } = useDataStore();

  const tenant = tenants.find((t) => t.id === currentUser?.tenantId);
  const property = tenant ? properties.find((p) => p.id === tenant.propertyId) : null;

  const myPayments = payments
    .filter((p) => p.tenantId === tenant?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const myMaintenance = maintenanceRequests
    .filter((r) => r.tenantId === tenant?.id && r.status !== 'completed' && r.status !== 'cancelled')
    .slice(0, 3);

  const myLateFees = lateFees.filter(
    (f) => f.tenantId === tenant?.id && f.status === 'active'
  );

  const totalLateFees = myLateFees.reduce((sum, f) => sum + f.amount, 0);

  if (!tenant || !property) {
    return (
      <div className="page-card text-center py-16">
        <p className="text-gray-500">Tenant profile not found. Please contact your property manager.</p>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    pending: 'badge-yellow',
    assigned: 'badge-blue',
    'in-progress': 'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-gray',
  };

  const priorityColor: Record<string, string> = {
    low: 'badge-gray',
    medium: 'badge-yellow',
    high: 'badge-red',
    emergency: 'badge-red',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, {tenant.firstName}!
        </h1>
        <p className="text-gray-500 mt-1">
          {property.address}, {property.city}, {property.state} {property.zip}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card border-blue-500">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Monthly Rent</p>
          <p className="text-2xl font-bold text-gray-800">${tenant.rentAmount.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Due on day {property.rentDueDay} of each month</p>
        </div>
        <div className={`stat-card ${myLateFees.length > 0 ? 'border-red-500' : 'border-green-500'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Outstanding Fees</p>
          <p className={`text-2xl font-bold ${myLateFees.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {myLateFees.length > 0 ? `$${totalLateFees.toLocaleString()}` : '$0'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {myLateFees.length > 0 ? `${myLateFees.length} late fee(s)` : 'All fees paid'}
          </p>
        </div>
        <div className="stat-card border-purple-500">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Lease Ends</p>
          <p className="text-2xl font-bold text-gray-800">
            {format(new Date(tenant.leaseEndDate), 'MMM d')}
          </p>
          <p className="text-xs text-gray-500 mt-1">{format(new Date(tenant.leaseEndDate), 'yyyy')}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Link
          to="/tenant/payment"
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <CreditCard size={20} className="text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">Make Payment</span>
        </Link>
        <Link
          to="/tenant/maintenance"
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
        >
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
            <Wrench size={20} className="text-yellow-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">Submit Request</span>
        </Link>
        <Link
          to="/tenant/history"
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
        >
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">Payment History</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="page-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Recent Payments</h2>
            <Link to="/tenant/history" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {myPayments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No payments yet</p>
          ) : (
            <div className="space-y-3">
              {myPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">{p.method} payment</p>
                    <p className="text-xs text-gray-500">{format(new Date(p.date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-700">${p.amount.toLocaleString()}</p>
                    <span className={`badge text-xs ${p.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Maintenance Requests */}
        <div className="page-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Open Maintenance</h2>
            <Link to="/tenant/maintenance" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {myMaintenance.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No open requests</p>
          ) : (
            <div className="space-y-3">
              {myMaintenance.map((r) => (
                <div key={r.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{r.title}</p>
                    <p className="text-xs text-gray-500">Submitted {format(new Date(r.submittedDate), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <span className={priorityColor[r.priority]}>{r.priority}</span>
                    <span className={statusColor[r.status]}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Late Fees */}
      {myLateFees.length > 0 && (
        <div className="page-card mt-6 border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="text-base font-semibold text-red-700">Outstanding Late Fees</h2>
          </div>
          <div className="space-y-2">
            {myLateFees.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-800">{f.reason}</p>
                  <p className="text-xs text-red-500">Due: {format(new Date(f.dueDate), 'MMM d, yyyy')}</p>
                </div>
                <p className="text-sm font-bold text-red-700">${f.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
