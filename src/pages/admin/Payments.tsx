import { useState } from 'react';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, AlertTriangle, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import type { LateFee } from '../../types';

const paymentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant required'),
  amount: z.coerce.number().min(1, 'Amount required'),
  date: z.string().min(1, 'Date required'),
  method: z.enum(['check', 'ach', 'stripe', 'cash', 'online']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const waiveSchema = z.object({
  waiverReason: z.string().min(1, 'Reason required'),
});

type WaiveFormData = z.infer<typeof waiveSchema>;

export function Payments() {
  const { payments, lateFees, tenants, properties, addPayment, updateLateFee, generateLateFees } = useDataStore();
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'payments' | 'fees'>('payments');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [waiveTarget, setWaiveTarget] = useState<LateFee | null>(null);
  const [filterTenant, setFilterTenant] = useState('');
  const [filterProperty, setFilterProperty] = useState('');

  const {
    register: regPayment,
    handleSubmit: handlePaymentSubmit,
    reset: resetPayment,
    control: controlPayment,
    formState: { errors: paymentErrors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<PaymentFormData>({ resolver: zodResolver(paymentSchema) as any });

  const {
    register: regWaive,
    handleSubmit: handleWaiveSubmit,
    reset: resetWaive,
    formState: { errors: waiveErrors },
  } = useForm<WaiveFormData>({ resolver: zodResolver(waiveSchema) });

  const selectedTenantId = useWatch({ control: controlPayment, name: 'tenantId', defaultValue: '' });
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  const filteredPayments = payments
    .filter((p) => {
      if (filterTenant && p.tenantId !== filterTenant) return false;
      if (filterProperty && p.propertyId !== filterProperty) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredFees = lateFees
    .filter((f) => {
      if (filterTenant && f.tenantId !== filterTenant) return false;
      if (filterProperty && f.propertyId !== filterProperty) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getTenantName = (tenantId: string) => {
    const t = tenants.find((x) => x.id === tenantId);
    return t ? `${t.firstName} ${t.lastName}` : 'Unknown';
  };

  const getPropertyAddress = (propertyId: string) => {
    const p = properties.find((x) => x.id === propertyId);
    return p ? p.address : 'Unknown';
  };

  const openPaymentModal = () => {
    resetPayment({
      tenantId: '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      method: 'check',
      reference: '',
      notes: '',
    });
    setIsPaymentModalOpen(true);
  };

  const onPaymentSubmit = async (data: PaymentFormData) => {
    const tenant = tenants.find((t) => t.id === data.tenantId);
    if (!tenant) return;
    try {
      await addPayment({
        tenantId: data.tenantId,
        propertyId: tenant.propertyId,
        amount: data.amount,
        date: data.date,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        status: 'completed',
      });
      toast.success('Payment recorded successfully');
      setIsPaymentModalOpen(false);
    } catch {
      toast.error('Failed to record payment');
    }
  };

  const onWaiveSubmit = async (data: WaiveFormData) => {
    if (waiveTarget) {
      try {
        await updateLateFee(waiveTarget.id, {
          status: 'waived',
          waiverReason: data.waiverReason,
          waivedBy: currentUser?.name ?? 'Admin',
          waivedAt: new Date().toISOString(),
        });
        toast.success('Late fee waived');
        setWaiveTarget(null);
        resetWaive();
      } catch {
        toast.error('Failed to waive late fee');
      }
    }
  };

  const handleGenerateLateFees = async () => {
    try {
      const generated = await generateLateFees(currentUser?.name ?? 'Admin');
      if (generated.length === 0) {
        toast.info('No new late fees to generate at this time');
      } else {
        toast.success(`Generated ${generated.length} late fee(s)`);
      }
    } catch {
      toast.error('Failed to generate late fees');
    }
  };

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

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Rent payments and late fees"
        actions={
          <button onClick={openPaymentModal} className="btn-primary">
            <Plus size={16} /> Record Payment
          </button>
        }
      />

      <div className="flex gap-4 mb-4">
        <select
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          className="input-field w-48"
        >
          <option value="">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
          ))}
        </select>
        <select
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
          className="input-field w-48"
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.address}</option>
          ))}
        </select>
      </div>

      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('payments')}
        >
          All Payments ({filteredPayments.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'fees'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('fees')}
        >
          Late Fees ({filteredFees.length})
        </button>
      </div>

      {activeTab === 'payments' && (
        <div className="page-card overflow-x-auto">
          {filteredPayments.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle />}
              title="No payments found"
              description="Record a payment to get started"
            />
          ) : (
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Tenant</th>
                  <th className="table-th">Property</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Method</th>
                  <th className="table-th">Reference</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-td">{format(new Date(p.date), 'MMM d, yyyy')}</td>
                    <td className="table-td font-medium">{getTenantName(p.tenantId)}</td>
                    <td className="table-td">{getPropertyAddress(p.propertyId)}</td>
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
      )}

      {activeTab === 'fees' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={handleGenerateLateFees} className="btn-secondary">
              <Zap size={16} /> Generate Late Fees
            </button>
          </div>
          <div className="page-card overflow-x-auto">
            {filteredFees.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle />}
                title="No late fees"
                description="No late fees have been generated"
              />
            ) : (
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Tenant</th>
                    <th className="table-th">Property</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Reason</th>
                    <th className="table-th">Due Date</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{getTenantName(f.tenantId)}</td>
                      <td className="table-td">{getPropertyAddress(f.propertyId)}</td>
                      <td className="table-td font-semibold text-red-600">
                        ${f.amount.toLocaleString()}
                      </td>
                      <td className="table-td">{f.reason}</td>
                      <td className="table-td">{format(new Date(f.dueDate), 'MMM d, yyyy')}</td>
                      <td className="table-td">
                        <span className={feeStatusBadge[f.status] || 'badge-gray'}>{f.status}</span>
                      </td>
                      <td className="table-td">
                        {f.status === 'active' && (
                          <button
                            onClick={() => {
                              setWaiveTarget(f);
                              resetWaive();
                            }}
                            className="btn btn-ghost btn-sm text-yellow-600 hover:bg-yellow-50"
                          >
                            Waive
                          </button>
                        )}
                        {f.status === 'waived' && f.waiverReason && (
                          <span className="text-xs text-gray-400">Reason: {f.waiverReason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment"
        size="md"
        footer={
          <>
            <button onClick={() => setIsPaymentModalOpen(false)} className="btn-outline">
              Cancel
            </button>
            <button onClick={handlePaymentSubmit(onPaymentSubmit as SubmitHandler<PaymentFormData>)} className="btn-success">
              Record Payment
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Tenant</label>
            <select {...regPayment('tenantId')} className="input-field">
              <option value="">Select tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
            {paymentErrors.tenantId && <p className="text-red-500 text-xs mt-1">{paymentErrors.tenantId.message}</p>}
          </div>
          {selectedTenant && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <p className="text-blue-700 font-medium">Property: {getPropertyAddress(selectedTenant.propertyId)}</p>
              <p className="text-blue-600">Rent: ${selectedTenant.rentAmount.toLocaleString()}/mo</p>
            </div>
          )}
          <div>
            <label className="label">Amount ($)</label>
            <input
              {...regPayment('amount')}
              type="number"
              className="input-field"
              defaultValue={selectedTenant?.rentAmount}
            />
            {paymentErrors.amount && <p className="text-red-500 text-xs mt-1">{paymentErrors.amount.message}</p>}
          </div>
          <div>
            <label className="label">Payment Date</label>
            <input {...regPayment('date')} type="date" className="input-field" />
            {paymentErrors.date && <p className="text-red-500 text-xs mt-1">{paymentErrors.date.message}</p>}
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select {...regPayment('method')} className="input-field">
              <option value="check">Check</option>
              <option value="ach">ACH</option>
              <option value="stripe">Stripe</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label className="label">Reference # (optional)</label>
            <input {...regPayment('reference')} className="input-field" placeholder="Check #1234" />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea {...regPayment('notes')} className="input-field" rows={2} />
          </div>
        </div>
      </Modal>

      {/* Waive Late Fee Modal */}
      <Modal
        isOpen={!!waiveTarget}
        onClose={() => setWaiveTarget(null)}
        title="Waive Late Fee"
        size="sm"
        footer={
          <>
            <button onClick={() => setWaiveTarget(null)} className="btn-outline">
              Cancel
            </button>
            <button onClick={handleWaiveSubmit(onWaiveSubmit as SubmitHandler<WaiveFormData>)} className="btn-warning btn bg-yellow-600 text-white hover:bg-yellow-700">
              Waive Fee
            </button>
          </>
        }
      >
        {waiveTarget && (
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800">
                Waiving ${waiveTarget.amount} fee for {getTenantName(waiveTarget.tenantId)}
              </p>
              <p className="text-yellow-600">{waiveTarget.reason}</p>
            </div>
            <div>
              <label className="label">Reason for Waiver</label>
              <textarea {...regWaive('waiverReason')} className="input-field" rows={3} placeholder="Explain why this fee is being waived..." />
              {waiveErrors.waiverReason && <p className="text-red-500 text-xs mt-1">{waiveErrors.waiverReason.message}</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
