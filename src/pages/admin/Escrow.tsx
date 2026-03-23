import { useState, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Landmark, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';

const transactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'interest']),
  tenantId: z.string().min(1, 'Tenant required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  description: z.string().min(1, 'Description required'),
  reference: z.string().optional(),
});

type TransactionForm = z.infer<typeof transactionSchema>;

export function Escrow() {
  const { escrowTransactions, tenants, properties, addEscrowTransaction } = useDataStore();
  const { currentUser } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<TransactionForm>({ resolver: zodResolver(transactionSchema) as any });

  const selectedTenantId = watch('tenantId');

  const tenantBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    escrowTransactions.forEach((t) => {
      if (!balances[t.tenantId]) balances[t.tenantId] = 0;
      if (t.type === 'deposit' || t.type === 'interest') {
        balances[t.tenantId] += t.amount;
      } else {
        balances[t.tenantId] -= t.amount;
      }
    });
    return balances;
  }, [escrowTransactions]);

  const totalEscrow = Object.values(tenantBalances).reduce((sum, b) => sum + Math.max(0, b), 0);

  const getTenantName = (tenantId: string) => {
    const t = tenants.find((x) => x.id === tenantId);
    return t ? `${t.firstName} ${t.lastName}` : 'Unknown';
  };

  const getPropertyAddress = (propertyId: string) => {
    const p = properties.find((x) => x.id === propertyId);
    return p ? p.address : 'Unknown';
  };

  const openModal = (type: 'deposit' | 'withdrawal') => {
    setTransactionType(type);
    reset({
      type: type,
      tenantId: '',
      amount: 0,
      description: type === 'deposit' ? 'Security deposit received' : '',
      reference: '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: TransactionForm) => {
    const tenant = tenants.find((t) => t.id === data.tenantId);
    if (!tenant) return;

    if (data.type === 'withdrawal') {
      const balance = tenantBalances[data.tenantId] ?? 0;
      if (data.amount > balance) {
        toast.error(`Insufficient balance. Available: $${balance.toLocaleString()}`);
        return;
      }
    }

    try {
      await addEscrowTransaction({
        type: data.type,
        tenantId: data.tenantId,
        propertyId: tenant.propertyId,
        amount: data.amount,
        description: data.description,
        reference: data.reference,
        approvedBy: currentUser?.name ?? 'Admin',
      });
      toast.success(data.type === 'deposit' ? 'Deposit recorded' : 'Withdrawal recorded');
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to record transaction');
    }
  };

  const sorted = [...escrowTransactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const typeBadge: Record<string, string> = {
    deposit: 'badge-green',
    withdrawal: 'badge-red',
    interest: 'badge-blue',
  };

  const tenantsWithBalance = tenants.filter((t) => (tenantBalances[t.id] ?? 0) > 0);

  return (
    <div>
      <PageHeader
        title="Escrow / Security Deposits"
        subtitle="Track tenant security deposit balances"
        actions={
          <div className="flex gap-2">
            <button onClick={() => openModal('deposit')} className="btn-success btn-sm btn">
              <ArrowUpCircle size={15} /> Deposit
            </button>
            <button onClick={() => openModal('withdrawal')} className="btn-danger btn-sm btn">
              <ArrowDownCircle size={15} /> Withdrawal
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Total Escrow Held"
          value={`$${totalEscrow.toLocaleString()}`}
          icon={<Landmark size={20} />}
          color="blue"
          subtitle={`${tenantsWithBalance.length} tenant(s)`}
        />
        <StatCard
          title="Total Transactions"
          value={escrowTransactions.length}
          icon={<Plus size={20} />}
          color="purple"
          subtitle="All time"
        />
      </div>

      {/* Tenant Balances */}
      <div className="page-card mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Balance by Tenant</h2>
        {tenantsWithBalance.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No escrow balances</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Tenant</th>
                <th className="table-th">Property</th>
                <th className="table-th">Balance</th>
              </tr>
            </thead>
            <tbody>
              {tenantsWithBalance.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{t.firstName} {t.lastName}</td>
                  <td className="table-td">{getPropertyAddress(t.propertyId)}</td>
                  <td className="table-td font-semibold text-green-700">
                    ${(tenantBalances[t.id] ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Transaction History */}
      <div className="page-card overflow-x-auto">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Transaction History</h2>
        {sorted.length === 0 ? (
          <EmptyState
            icon={<Landmark />}
            title="No transactions"
            description="Record a deposit or withdrawal to get started"
          />
        ) : (
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Type</th>
                <th className="table-th">Tenant</th>
                <th className="table-th">Property</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Description</th>
                <th className="table-th">Approved By</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="table-td">{format(new Date(t.createdAt), 'MMM d, yyyy')}</td>
                  <td className="table-td">
                    <span className={typeBadge[t.type] || 'badge-gray'}>{t.type}</span>
                  </td>
                  <td className="table-td font-medium">{getTenantName(t.tenantId)}</td>
                  <td className="table-td">{getPropertyAddress(t.propertyId)}</td>
                  <td className={`table-td font-semibold ${t.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                    {t.type === 'withdrawal' ? '-' : '+'}${t.amount.toLocaleString()}
                  </td>
                  <td className="table-td">{t.description}</td>
                  <td className="table-td text-gray-500">{t.approvedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={transactionType === 'deposit' ? 'Record Deposit' : 'Record Withdrawal'}
        size="md"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn-outline">Cancel</button>
            <button
              onClick={handleSubmit(onSubmit as SubmitHandler<TransactionForm>)}
              className={transactionType === 'deposit' ? 'btn-success' : 'btn-danger'}
            >
              {transactionType === 'deposit' ? 'Record Deposit' : 'Record Withdrawal'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Transaction Type</label>
            <select {...register('type')} className="input-field">
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="interest">Interest</option>
            </select>
          </div>
          <div>
            <label className="label">Tenant</label>
            <select {...register('tenantId')} className="input-field">
              <option value="">Select tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                  {tenantBalances[t.id] ? ` (Balance: $${(tenantBalances[t.id] ?? 0).toLocaleString()})` : ''}
                </option>
              ))}
            </select>
            {errors.tenantId && <p className="text-red-500 text-xs mt-1">{errors.tenantId.message}</p>}
          </div>
          {selectedTenantId && tenantBalances[selectedTenantId] !== undefined && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <p className="text-blue-700">
                Current Balance: <strong>${(tenantBalances[selectedTenantId] ?? 0).toLocaleString()}</strong>
              </p>
            </div>
          )}
          <div>
            <label className="label">Amount ($)</label>
            <input {...register('amount')} type="number" className="input-field" min={0} step="0.01" />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <input {...register('description')} className="input-field" placeholder="Describe the transaction" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <label className="label">Reference (optional)</label>
            <input {...register('reference')} className="input-field" placeholder="Check number, etc." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
