import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Wrench,
  HardHat,
  FileText,
  Landmark,
  BookUser,
  FolderOpen,
  LogOut,
  Home,
  History,
  ScrollText,
  Building,
  Calendar as CalendarIcon,
  Tv2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const adminNav = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Calendar', to: '/admin/calendar', icon: CalendarIcon },
  { label: 'Properties', to: '/admin/properties', icon: Building2 },
  { label: 'Tenants', to: '/admin/tenants', icon: Users },
  { label: 'Payments', to: '/admin/payments', icon: CreditCard },
  { label: 'Maintenance', to: '/admin/maintenance', icon: Wrench },
  { label: 'Technicians', to: '/admin/technicians', icon: HardHat },
  { label: 'Appliances', to: '/admin/appliances', icon: Tv2 },
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

export function Sidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const isAdmin = currentUser?.role === 'admin';
  const navItems = isAdmin ? adminNav : tenantNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-16'
      } flex-shrink-0 bg-gradient-to-b from-[#0d1f2d] to-[#1a3a52] min-h-screen flex flex-col shadow-xl transition-all duration-300 print:hidden`}
    >
      <div className={`px-3 py-6 border-b border-white/10 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c9a961] rounded-xl flex items-center justify-center flex-shrink-0">
              <Building size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-none">Manzione</p>
              <p className="text-white/60 text-xs mt-0.5">Properties</p>
            </div>
          </div>
        )}
        {!isOpen && (
          <div className="w-10 h-10 bg-[#c9a961] rounded-xl flex items-center justify-center flex-shrink-0">
            <Building size={20} className="text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {isOpen && (
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 mb-3">
            {isAdmin ? 'Admin Panel' : 'Tenant Portal'}
          </p>
        )}
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/tenant'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${isOpen ? '' : 'justify-center px-0'}`
            }
            title={!isOpen ? label : undefined}
          >
            <Icon size={16} className="flex-shrink-0" />
            {isOpen && <span className="text-sm">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={`px-2 py-4 border-t border-white/10`}>
        {isOpen && (
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {currentUser?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{currentUser?.name}</p>
              <p className="text-white/50 text-xs truncate capitalize">{currentUser?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/20 ${isOpen ? '' : 'justify-center px-0'}`}
          title={!isOpen ? 'Logout' : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {isOpen && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
