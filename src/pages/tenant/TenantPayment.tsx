import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CreditCard,
  CheckCircle,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { toast } from '../../components/ui/toastStore';
import { supabase } from '../../lib/supabase';
import { getStripePublishableKeyMode, stripePromise, stripeEnabled } from '../../lib/stripe';
import type { Payment } from '../../types';

const schema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be positive'),
  method: z.enum(['check', 'ach', 'stripe', 'cash', 'online']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#1f2937',
      fontFamily: 'Inter, system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444' },
  },
};

// ─── Inner form that uses Stripe hooks ────────────────────────────────────────

function StripePaymentForm({
  tenant,
  property,
  amount,
  onSuccess,
}: {
  tenant: import('../../types').Tenant;
  property: import('../../types').Property;
  amount: number;
  onSuccess: (payment: Payment) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { addPayment } = useDataStore();
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    setCardError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again before making a payment.');
      }

      // 1. Create a Payment Intent via Supabase Edge Function
      const { data: intentData, error: intentError } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            amount: Math.round(amount * 100), // cents
            tenantId: tenant.id,
            propertyId: tenant.propertyId,
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            propertyAddress: property.address,
          },
        }
      );

      const stripeMode = getStripePublishableKeyMode();
      if (stripeMode && typeof intentData?.livemode === 'boolean') {
        const intentMode = intentData.livemode ? 'live' : 'test';
        if (intentMode !== stripeMode) {
          throw new Error(
            `Stripe key mismatch: the app is using a ${stripeMode} publishable key but the payment intent was created in ${intentMode} mode. Make sure VITE_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY are both from Stripe ${stripeMode} mode.`
          );
        }
      }

      if (intentError || !intentData?.clientSecret) {
        const functionMessage =
          typeof intentData?.error === 'string'
            ? intentData.error
            : intentError?.message;
        throw new Error(functionMessage ?? 'Failed to create payment intent');
      }

      // 2. Confirm card payment with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        intentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${tenant.firstName} ${tenant.lastName}`,
              email: tenant.email,
            },
          },
        }
      );

      if (stripeError) {
        const isMissingPaymentIntent = stripeError.message?.includes('No such payment_intent');
        const message = isMissingPaymentIntent
          ? `Stripe key mismatch: the payment intent was created in Stripe account ${intentData.stripeAccountId ?? 'unknown'}, but the browser is using a different publishable key. Update VITE_STRIPE_PUBLISHABLE_KEY to the test publishable key from that same Stripe account and redeploy the frontend.`
          : (stripeError.message ?? 'Payment failed');

        setCardError(message);
        toast.error(message);
        return;
      }

      if (!paymentIntent) {
        throw new Error('Stripe did not return a payment result. Please try again.');
      }

      if (!['succeeded', 'processing'].includes(paymentIntent.status)) {
        throw new Error(`Payment was not completed. Stripe status: ${paymentIntent.status}`);
      }

      // 3. Record payment in database
      const payment = await addPayment({
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        amount,
        date: format(new Date(), 'yyyy-MM-dd'),
        method: 'stripe',
        reference: paymentIntent?.id,
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
      });

      toast.success(
        paymentIntent.status === 'succeeded'
          ? 'Payment processed successfully!'
          : 'Payment submitted and is processing.'
      );
      onSuccess(payment);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      setCardError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Card Details</label>
        <div className="border border-gray-300 rounded-lg px-4 py-3 bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        {cardError && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-red-500 text-xs">{cardError}</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex gap-2">
        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
        <span>Your card details are securely processed by Stripe and never stored on our servers.</span>
      </div>

      <button
        onClick={handlePay}
        disabled={!stripe || loading}
        className="btn-primary w-full justify-center py-3"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          `Pay $${amount.toLocaleString()} Now`
        )}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TenantPayment() {
  const { currentUser } = useAuthStore();
  const { tenants, properties, addPayment } = useDataStore();
  const [submittedPayment, setSubmittedPayment] = useState<Payment | null>(null);
  const [paymentMode, setPaymentMode] = useState<'card' | 'manual'>('card');

  const tenant = tenants.find((t) => t.id === currentUser?.tenantId);
  const property = tenant ? properties.find((p) => p.id === tenant.propertyId) : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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
        <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Tenant profile not found. Contact your property manager.</p>
      </div>
    );
  }

  const onManualSubmit = async (data: FormData) => {
    const payment = await addPayment({
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
    toast.success('Payment recorded! Your property manager will confirm receipt.');
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
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {submittedPayment.method === 'stripe' ? 'Payment Successful!' : 'Payment Submitted!'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {submittedPayment.method === 'stripe'
              ? 'Your payment has been processed.'
              : 'Your payment is being processed.'}
          </p>

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
                <span className="capitalize">{submittedPayment.method === 'stripe' ? 'Credit/Debit Card' : submittedPayment.method}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Property</span>
                <span>{property.address}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Status</span>
                <span className={submittedPayment.status === 'completed' ? 'badge-green' : 'badge-yellow'}>
                  {submittedPayment.status === 'completed' ? 'Completed' : 'Pending'}
                </span>
              </div>
              {submittedPayment.reference && (
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-500">Reference</span>
                  <span className="font-mono text-xs">{submittedPayment.reference}</span>
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

        {stripeEnabled && (
          <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
            <button
              onClick={() => setPaymentMode('card')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                paymentMode === 'card'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Pay by Card
            </button>
            <button
              onClick={() => setPaymentMode('manual')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                paymentMode === 'manual'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Record Payment
            </button>
          </div>
        )}

        <div className="page-card">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-primary" />
            {stripeEnabled && paymentMode === 'card' ? 'Secure Card Payment' : 'Payment Details'}
          </h2>

          {stripeEnabled && paymentMode === 'card' && stripePromise ? (
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                tenant={tenant}
                property={property}
                amount={tenant.rentAmount}
                onSuccess={setSubmittedPayment}
              />
            </Elements>
          ) : (
            <form onSubmit={handleSubmit(onManualSubmit as SubmitHandler<FormData>)} className="space-y-4">
              <div>
                <label className="label">Amount ($)</label>
                <input {...register('amount')} type="number" className="input-field" min={1} step="0.01" />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="label">Payment Method</label>
                <select {...register('method')} className="input-field">
                  <option value="online">Online / Portal</option>
                  <option value="ach">ACH Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
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

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  `Submit Payment of $${tenant.rentAmount.toLocaleString()}`
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          {stripeEnabled && paymentMode === 'card'
            ? 'Payments are secured by Stripe. Your card details are never stored.'
            : 'Payments are recorded immediately. Your property manager will confirm receipt.'}
        </p>
      </div>
    </div>
  );
}
