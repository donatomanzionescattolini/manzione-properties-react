import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-05-28.basil',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (!profile || profile.role !== 'admin') {
          return new Response(
            JSON.stringify({ error: 'Forbidden: admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const { tenantId, email, name, propertyAddress, portalUrl } = await req.json();

    if (!tenantId || !email || !name) {
      return new Response(
        JSON.stringify({ error: 'tenantId, email, and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase auth user and send invitation email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${portalUrl ?? Deno.env.get('SITE_URL')}/set-password`,
        data: {
          name,
          role: 'tenant',
          tenant_id: tenantId,
        },
      }
    );

    if (userError) {
      // If user already exists, update their profile instead
      if (userError.message.includes('already been registered')) {
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const user = existingUser?.users?.find((u) => u.email === email);
        if (user) {
          await supabaseAdmin
            .from('profiles')
            .upsert({
              id: user.id,
              name,
              role: 'tenant',
              tenant_id: tenantId,
            });
          return new Response(
            JSON.stringify({ success: true, userId: user.id, message: 'Profile updated for existing user' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      throw userError;
    }

    // Create profile record
    if (userData.user) {
      await supabaseAdmin.from('profiles').upsert({
        id: userData.user.id,
        name,
        role: 'tenant',
        tenant_id: tenantId,
      });
    }

    try {
      if (Deno.env.get('STRIPE_SECRET_KEY')) {
        // Fetch tenant & property data to setup automated email reminders
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('*, properties(*)')
          .eq('id', tenantId)
          .single();

        if (tenant && tenant.properties) {
          const property = tenant.properties;
          
          // Create Stripe Customer
          const customer = await stripe.customers.create({
            email,
            name,
            metadata: { tenantId, propertyId: property.id },
          });

          // Create Product/Price dynamically if needed for rent
          const product = await stripe.products.create({
            name: `Rent for ${property.address}`,
            metadata: { propertyId: property.id },
          });

          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(tenant.rent_amount * 100),
            currency: 'usd',
            recurring: { interval: 'month' },
          });

          // Define the billing cycle to match the due date
          const now = new Date();
          let nextDue = new Date(now.getFullYear(), now.getMonth(), property.rent_due_day);
          if (nextDue <= now) {
             nextDue.setMonth(nextDue.getMonth() + 1);
          }
          const billingCycleAnchor = Math.floor(nextDue.getTime() / 1000);

          // Create Subscription to send invoices automatically
          await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.id }],
            collection_method: 'send_invoice', // Auto-emails the tenant
            days_until_due: property.grace_period || 5,
            billing_cycle_anchor: billingCycleAnchor,
            proration_behavior: 'none',
            metadata: { tenantId, propertyId: property.id },
          });
        }
      }
    } catch (stripeErr) {
      console.warn('Failed to set up Stripe email reminders:', stripeErr);
    }

    // Send welcome notification
    try {
      await supabaseAdmin.functions.invoke('send-notification', {
        body: {
          type: 'tenant_welcome',
          to: email,
          data: {
            tenantName: name,
            propertyAddress: propertyAddress ?? 'your property',
            portalUrl: portalUrl ?? Deno.env.get('SITE_URL') ?? '',
          },
        },
      });
    } catch (notifErr) {
      console.warn('Welcome notification failed:', notifErr);
    }

    return new Response(
      JSON.stringify({ success: true, userId: userData.user?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
