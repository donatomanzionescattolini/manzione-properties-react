import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@manzione.com';
const FROM_NAME = Deno.env.get('FROM_NAME') ?? 'Manzione Properties';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationType =
  | 'payment_received'
  | 'payment_confirmed'
  | 'maintenance_update'
  | 'lease_expiring'
  | 'late_fee_issued'
  | 'tenant_welcome';

interface EmailPayload {
  type: NotificationType;
  to: string;
  data: Record<string, string | number>;
}

function buildEmail(type: NotificationType, data: Record<string, string | number>) {
  const templates: Record<NotificationType, { subject: string; html: string }> = {
    payment_received: {
      subject: `Payment Received - $${data.amount}`,
      html: `
        <h2>Payment Received</h2>
        <p>We have received your payment of <strong>$${data.amount}</strong> for ${data.propertyAddress}.</p>
        <p><strong>Date:</strong> ${data.date}</p>
        <p><strong>Method:</strong> ${data.method}</p>
        ${data.reference ? `<p><strong>Reference:</strong> ${data.reference}</p>` : ''}
        <p>Thank you for your payment!</p>
        <hr/>
        <p style="color:#888;font-size:12px">Manzione Properties</p>
      `,
    },
    payment_confirmed: {
      subject: `Payment Confirmed - $${data.amount}`,
      html: `
        <h2>Payment Confirmed</h2>
        <p>Your payment of <strong>$${data.amount}</strong> has been confirmed.</p>
        <p><strong>Property:</strong> ${data.propertyAddress}</p>
        <p><strong>Date:</strong> ${data.date}</p>
        <p>Your account is up to date.</p>
        <hr/>
        <p style="color:#888;font-size:12px">Manzione Properties</p>
      `,
    },
    maintenance_update: {
      subject: `Maintenance Request Update - ${data.title}`,
      html: `
        <h2>Maintenance Request Update</h2>
        <p>Your maintenance request <strong>"${data.title}"</strong> has been updated.</p>
        <p><strong>New Status:</strong> ${data.status}</p>
        ${data.note ? `<p><strong>Note from manager:</strong> ${data.note}</p>` : ''}
        <p><strong>Property:</strong> ${data.propertyAddress}</p>
        <hr/>
        <p style="color:#888;font-size:12px">Manzione Properties</p>
      `,
    },
    lease_expiring: {
      subject: `Lease Expiring Soon - ${data.propertyAddress}`,
      html: `
        <h2>Lease Expiration Notice</h2>
        <p>Your lease at <strong>${data.propertyAddress}</strong> is expiring on <strong>${data.leaseEndDate}</strong>.</p>
        <p>Please contact your property manager to discuss renewal options.</p>
        <hr/>
        <p style="color:#888;font-size:12px">Manzione Properties</p>
      `,
    },
    late_fee_issued: {
      subject: `Late Fee Notice - $${data.amount}`,
      html: `
        <h2>Late Fee Notice</h2>
        <p>A late fee of <strong>$${data.amount}</strong> has been added to your account.</p>
        <p><strong>Reason:</strong> ${data.reason}</p>
        <p><strong>Due Date:</strong> ${data.dueDate}</p>
        <p>Please log in to your tenant portal to make a payment.</p>
        <hr/>
        <p style="color:#888;font-size:12px">Manzione Properties</p>
      `,
    },
    tenant_welcome: {
      subject: `Welcome to ${data.propertyAddress}`,
      html: `
        <h2>Welcome to Manzione Properties!</h2>
        <p>Dear ${data.tenantName},</p>
        <p>Your tenant account has been set up for <strong>${data.propertyAddress}</strong>.</p>
        <p>You can log in at <a href="${data.portalUrl}">${data.portalUrl}</a> to:</p>
        <ul>
          <li>Make rent payments online</li>
          <li>Submit maintenance requests</li>
          <li>View your documents</li>
        </ul>
        <hr/>
        <p style="color:#888;font-size:12px">Manzione Properties</p>
      `,
    },
  };

  return templates[type] ?? { subject: 'Notification', html: '<p>You have a new notification.</p>' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { subject, html } = buildEmail(payload.type, payload.data);

    if (!RESEND_API_KEY) {
      // Log the email if Resend is not configured (dev mode)
      console.log('Email notification (Resend not configured):', { to: payload.to, subject });
      return new Response(
        JSON.stringify({ success: true, message: 'Email logged (Resend not configured)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [payload.to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await response.json();
    return new Response(
      JSON.stringify({ success: true, id: result.id }),
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
