import { format } from 'date-fns';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';

export function TenantHistory() {
  const { currentUser } = useAuthStore();
  const { tenants, payments, lateFees } = useDataStore();

  const tenant = tenants.find((t) => t.id === currentUser?.tenantId);

  const myPayments = payments
    .filter((p) => p.tenantId === tenant?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const myFees = lateFees
    .filter((f) => f.tenantId === tenant?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalPaid = myPayments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const activeFees = myFees.filter((f) => f.status === 'active');
  const totalActiveFees = activeFees.reduce((sum, f) => sum + f.amount, 0);

  const statusBadge: Record<string, string> = {
    completed: 'badge-green',
    pending: 'badge-yellow',
    failed: 'badge-red',
    refunded: 'badge-gray',
  };

  const feeStatusBadge: Record<string, string> = {
    active: 'badge-red',
    paid: 'badge-green',
    waived: 'badge-gray',
  };

  if (!tenant) {
    return (
      <div className="page-card text-center py-16">
        <p className="text-gray-500">Tenant profile not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Payment History" subtitle="Your complete payment record" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card border-green-500">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-700">${totalPaid.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">All time</p>
        </div>
        <div className="stat-card border-blue-500">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Payments</p>
          <p className="text-2xl font-bold text-gray-800">{myPayments.length}</p>
          <p className="text-xs text-gray-500 mt-1">Recorded transactions</p>
        </div>
        <div className={`stat-card ${activeFees.length > 0 ? 'border-red-500' : 'border-gray-200'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Outstanding Fees</p>
          <p className={`text-2xl font-bold ${activeFees.length > 0 ? 'text-red-700' : 'text-gray-400'}`}>
            ${totalActiveFees.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">{activeFees.length} active fee(s)</p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="page-card mb-6 overflow-x-auto">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CreditCard size={16} className="text-primary" /> Payments
        </h2>
        {myPayments.length === 0 ? (
          <EmptyState
            icon={<CreditCard />}
            title="No payments yet"
            description="Your payment history will appear here"
          />
        ) : (
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Method</th>
                <th className="table-th">Reference</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {myPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-td">{format(new Date(p.date), 'MMM d, yyyy')}</td>
                  <td className="table-td font-semibold text-green-700">
                    ${p.amount.toLocaleString()}
                  </td>
                  <td className="table-td capitalize">{p.method}</td>
                  <td className="table-td text-gray-500">{p.reference || '-'}</td>
                  <td className="table-td">
                    <span className={statusBadge[p.status] || 'badge-gray'}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Late Fees */}
      {myFees.length > 0 && (
        <div className="page-card overflow-x-auto">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-500" /> Late Fees
          </h2>
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Reason</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Due Date</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {myFees.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="table-td">{format(new Date(f.createdAt), 'MMM d, yyyy')}</td>
                  <td className="table-td">{f.reason}</td>
                  <td className="table-td font-semibold text-red-600">
                    ${f.amount.toLocaleString()}
                  </td>
                  <td className="table-td">{format(new Date(f.dueDate), 'MMM d, yyyy')}</td>
                  <td className="table-td">
                    <span className={feeStatusBadge[f.status] || 'badge-gray'}>{f.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
