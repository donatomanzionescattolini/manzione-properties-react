import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const resetSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

type LoginData = z.infer<typeof loginSchema>;
type ResetData = z.infer<typeof resetSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { login, resetPassword } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authMessage = searchParams.get('message');

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) });

  const onLogin = async (data: LoginData) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      if (result.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/tenant');
      }
    } else {
      loginForm.setError('root', { message: result.message });
    }
  };

  const onResetPassword = async (data: ResetData) => {
    const result = await resetPassword(data.email);
    if (result.success) {
      setResetSent(true);
    } else {
      resetForm.setError('root', { message: result.message });
    }
  };

  if (showReset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1f2d] via-[#1a3a52] to-[#2d5a7b] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c9a961] rounded-2xl mb-4 shadow-lg">
              <Building size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Manzione Properties</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <button
              onClick={() => { setShowReset(false); setResetSent(false); }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>

            {resetSent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={28} className="text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Check Your Email</h2>
                <p className="text-gray-500 text-sm">
                  We sent a password reset link to <strong>{resetForm.getValues('email')}</strong>.
                  Check your inbox and follow the link to reset your password.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Reset Password</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                  <div>
                    <label className="label">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        {...resetForm.register('email')}
                        type="email"
                        className="input-field pl-9"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                    {resetForm.formState.errors.email && (
                      <p className="text-red-500 text-xs mt-1">{resetForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  {resetForm.formState.errors.root && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-600 text-sm">{resetForm.formState.errors.root.message}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetForm.formState.isSubmitting}
                    className="btn-primary w-full justify-center py-3"
                  >
                    {resetForm.formState.isSubmitting ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1f2d] via-[#1a3a52] to-[#2d5a7b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c9a961] rounded-2xl mb-4 shadow-lg">
            <Building size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Manzione Properties</h1>
          <p className="text-white/60 mt-2">Property Management Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign In</h2>

          {authMessage && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">{authMessage}</p>
            </div>
          )}

          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...loginForm.register('email')}
                  type="email"
                  className="input-field pl-9"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Password</label>
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-xs text-primary hover:text-primary-dark"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...loginForm.register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-9 pr-10"
                  placeholder="Your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            {loginForm.formState.errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{loginForm.formState.errors.root.message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="btn-primary w-full justify-center py-3"
            >
              {loginForm.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Contact your property manager if you need access.
            </p>
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
              <p className="font-medium mb-1">First time signing in?</p>
              <p>Check your email for an invitation link from your property manager to set up your account.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

