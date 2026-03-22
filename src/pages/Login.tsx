import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

// Show demo buttons only when VITE_DEMO_MODE=true (never in production)
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { loginAsync } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const result = await loginAsync(data.email, data.password);
    if (result.success) {
      const user = useAuthStore.getState().currentUser;
      if (user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/tenant');
      }
    } else {
      setError('root', { message: result.message });
    }
  };

  const fillDemo = async (role: 'admin' | 'tenant') => {
    const email = role === 'admin' ? 'admin@manzione.com' : 'john@example.com';
    const password = role === 'admin' ? 'admin123' : 'tenant123';
    const result = await loginAsync(email, password);
    if (result.success) {
      navigate(role === 'admin' ? '/admin' : '/tenant');
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
          <p className="text-white/60 mt-2">Property Management Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign In</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('email')}
                  type="email"
                  className="input-field pl-9"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('password')}
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
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
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
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {DEMO_MODE && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-3 text-center font-medium uppercase tracking-wider">
                Demo Access
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fillDemo('admin')}
                  className="btn-outline text-xs justify-center py-2.5"
                >
                  Admin Demo
                </button>
                <button
                  onClick={() => fillDemo('tenant')}
                  className="btn-ghost text-xs justify-center py-2.5 border border-gray-200"
                >
                  Tenant Demo
                </button>
              </div>
              <div className="mt-4 bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                <p><span className="font-medium">Admin:</span> admin@manzione.com / admin123</p>
                <p><span className="font-medium">Tenant:</span> john@example.com / tenant123</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
