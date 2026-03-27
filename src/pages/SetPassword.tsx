import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

export function SetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Supabase automatically processes the invite/recovery hash on page load.
  // We wait for the session to be ready before showing the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.updateUser({ password: data.password });

    if (error) {
      setError('root', { message: error.message });
      return;
    }

    setDone(true);

    // Redirect based on the user's role
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      setTimeout(() => {
        navigate(profile?.role === 'admin' ? '/admin' : '/tenant', { replace: true });
      }, 1500);
    } else {
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1f2d] via-[#1a3a52] to-[#2d5a7b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c9a961] rounded-2xl mb-4 shadow-lg">
            <Building size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Manzione Properties</h1>
          <p className="text-white/60 mt-2">Tenant Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!sessionReady ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Verifying your invitation…</p>
            </div>
          ) : done ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Password Set!</h2>
              <p className="text-gray-500 text-sm">Taking you to your dashboard…</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Set Your Password</h2>
              <p className="text-gray-500 text-sm mb-6">
                Create a password to access your tenant portal.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pl-9 pr-10"
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      {...register('confirm')}
                      type={showConfirm ? 'text' : 'password'}
                      className="input-field pl-9 pr-10"
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>
                  )}
                </div>

                {errors.root && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{errors.root.message}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full justify-center py-3"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Setting password…
                    </span>
                  ) : (
                    'Set Password & Continue'
                  )}
                </button>
              </form>

              <div className="mt-4 text-xs text-gray-400 space-y-1">
                <p>Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>At least 8 characters</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one number</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

