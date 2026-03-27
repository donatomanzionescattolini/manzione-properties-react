import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
