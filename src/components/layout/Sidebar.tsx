import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Wrench,
  FileText,
  Landmark,
  BookUser,
  FolderOpen,
  LogOut,
  Home,
  History,
  ScrollText,
  Building,
} from 'lucide-react';

const adminNav = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Properties', to: '/admin/properties', icon: Building2 },
  { label: 'Tenants', to: '/admin/tenants', icon: Users },
  { label: 'Payments', to: '/admin/payments', icon: CreditCard },
  { label: 'Maintenance', to: '/admin/maintenance', icon: Wrench },
  { label: 'Reports', to: '/admin/reports', icon: FileText },
  { label: 'Escrow', to: '/admin/escrow', icon: Landmark },
  { label: 'CRM', to: '/admin/crm', icon: BookUser },
  { label: 'Documents', to: '/admin/documents', icon: FolderOpen },
];

const tenantNav = [
  { label: 'Home', to: '/tenant', icon: Home },
  { label: 'Make Payment', to: '/tenant/payment', icon: CreditCard },
  { label: 'Payment History', to: '/tenant/history', icon: History },
  { label: 'Maintenance', to: '/tenant/maintenance', icon: Wrench },
  { label: 'Documents', to: '/tenant/documents', icon: ScrollText },
];

export function Sidebar() {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const isAdmin = currentUser?.role === 'admin';
  const navItems = isAdmin ? adminNav : tenantNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-gradient-to-b from-[#0d1f2d] to-[#1a3a52] min-h-screen flex flex-col shadow-xl">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#c9a961] rounded-xl flex items-center justify-center">
            <Building size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">Manzione</p>
            <p className="text-white/60 text-xs mt-0.5">Properties</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 mb-3">
          {isAdmin ? 'Admin Panel' : 'Tenant Portal'}
        </p>
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/tenant'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={16} />
            <span className="text-sm">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {currentUser?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{currentUser?.name}</p>
            <p className="text-white/50 text-xs truncate capitalize">{currentUser?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/20"
        >
          <LogOut size={16} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}
