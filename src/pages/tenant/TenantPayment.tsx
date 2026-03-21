import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { toast } from '../../components/ui/Toast';
import type { Payment } from '../../types';

const schema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be positive'),
  method: z.enum(['check', 'ach', 'stripe', 'cash', 'online']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function TenantPayment() {
  const { currentUser } = useAuthStore();
  const { tenants, properties, addPayment } = useDataStore();
  const [submittedPayment, setSubmittedPayment] = useState<Payment | null>(null);

  const tenant = tenants.find((t) => t.id === currentUser?.tenantId);
  const property = tenant ? properties.find((p) => p.id === tenant.propertyId) : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      amount: tenant?.rentAmount ?? 0,
      method: 'online',
      reference: '',
      notes: '',
    },
  });

  if (!tenant || !property) {
    return (
      <div className="page-card text-center py-16">
        <p className="text-gray-500">Tenant profile not found.</p>
      </div>
    );
  }

  const onSubmit = (data: FormData) => {
    const payment = addPayment({
      tenantId: tenant.id,
      propertyId: tenant.propertyId,
      amount: data.amount,
      date: format(new Date(), 'yyyy-MM-dd'),
      method: data.method,
      reference: data.reference,
      notes: data.notes,
      status: 'pending',
    });
    setSubmittedPayment(payment);
    toast.success('Payment submitted successfully!');
  };

  if (submittedPayment) {
    return (
      <div>
        <PageHeader title="Make a Payment" />
        <div className="max-w-md mx-auto page-card text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Submitted!</h2>
          <p className="text-gray-500 text-sm mb-6">Your payment is being processed.</p>

          <div className="text-left border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt</p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-green-700">${submittedPayment.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Date</span>
                <span>{format(new Date(submittedPayment.date), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Method</span>
                <span className="capitalize">{submittedPayment.method}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Property</span>
                <span>{property.address}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Status</span>
                <span className="badge-yellow">Pending</span>
              </div>
              {submittedPayment.reference && (
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-500">Reference</span>
                  <span>{submittedPayment.reference}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setSubmittedPayment(null)}
            className="btn-primary w-full justify-center"
          >
            Make Another Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Make a Payment" subtitle={`${property.address}, ${property.city}`} />

      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-5 text-white mb-6">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">Rent Due</p>
          <p className="text-3xl font-bold">${tenant.rentAmount.toLocaleString()}</p>
          <p className="text-white/60 text-sm mt-1">Due on day {property.rentDueDay} of each month</p>
        </div>

        <div className="page-card">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-primary" /> Payment Details
          </h2>

          <form onSubmit={handleSubmit(onSubmit as SubmitHandler<FormData>)} className="space-y-4">
            <div>
              <label className="label">Amount ($)</label>
              <input {...register('amount')} type="number" className="input-field" min={1} step="0.01" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="label">Payment Method</label>
              <select {...register('method')} className="input-field">
                <option value="online">Online</option>
                <option value="ach">ACH Bank Transfer</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>

            <div>
              <label className="label">Reference / Check Number (optional)</label>
              <input {...register('reference')} className="input-field" placeholder="Check #1234" />
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea {...register('notes')} className="input-field" rows={3} placeholder="Any additional information..." />
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3">
              Submit Payment of ${tenant.rentAmount.toLocaleString()}
            </button>
          </form>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Payments are recorded immediately. Your property manager will confirm receipt.
        </p>
      </div>
    </div>
  );
}
