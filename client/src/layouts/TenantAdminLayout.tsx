import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  GitBranch,
  Briefcase,
  Shield,
  Settings,
  Menu,
  X,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function TenantAdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const checkRTL = () => {
      const dir = document.documentElement.getAttribute('dir') || 'ltr';
      const lang = document.documentElement.lang || 'en';
      setIsRTL(dir === 'rtl' || lang === 'ar');
    };

    checkRTL();
    const observer = new MutationObserver(checkRTL);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir', 'lang'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigation = [
    { name: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, nameAr: 'لوحة الإدارة' },
    { name: 'Business Lines', href: '/admin/business-lines', icon: Briefcase, nameAr: 'خطوط الأعمال' },
    { name: 'Branches', href: '/admin/branches', icon: GitBranch, nameAr: 'الفروع' },
    { name: 'Users', href: '/admin/users', icon: Users, nameAr: 'المستخدمين' },
    { name: 'Roles', href: '/admin/roles', icon: Shield, nameAr: 'الأدوار' },
    { name: 'Tenant Settings', href: '/admin/settings', icon: Settings, nameAr: 'إعدادات المؤسسة' },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard' || location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`min-h-screen flex ${isRTL ? 'flex-row-reverse' : 'flex-row'}`} style={{ backgroundColor: 'var(--tenant-bg)' }}>
      <aside
        className={`
          ${isSidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
          ${isMobile ? 'fixed inset-y-0 z-50 w-64' : 'relative w-64'}
          transition-transform duration-300 ease-in-out
          flex flex-col
          ${isRTL ? 'border-l' : 'border-r'}
        `}
        style={{ backgroundColor: 'var(--tenant-surface)', borderColor: 'var(--tenant-border)' }}
      >
        <div className={`h-16 flex items-center px-6 border-b ${isRTL ? 'flex-row-reverse' : ''}`} style={{ borderColor: 'var(--tenant-border)' }}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--tenant-accent)' }}
            >
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-sm font-bold" style={{ color: 'var(--tenant-text)' }}>
                {isRTL ? 'إدارة المؤسسة' : 'Tenant Admin'}
              </h1>
              <p className="text-xs" style={{ color: 'var(--tenant-text-muted)' }}>
                {isRTL ? 'لوحة الإدارة' : 'Management Panel'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => isMobile && setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isRTL ? 'flex-row-reverse' : ''}
                `}
                style={active 
                  ? { backgroundColor: 'var(--tenant-accent)', color: 'white' }
                  : { color: 'var(--tenant-text-secondary)' }
                }
                onMouseEnter={(e) => !active && (e.currentTarget.style.backgroundColor = 'var(--tenant-surface-hover)')}
                onMouseLeave={(e) => !active && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Icon className="w-5 h-5" />
                <span>{isRTL ? item.nameAr : item.name}</span>
                {active && (
                  <ChevronRight className={`w-4 h-4 ml-auto ${isRTL ? 'rotate-180' : ''}`} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--tenant-border)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--tenant-text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut className="w-5 h-5" />
            <span>{isRTL ? 'تسجيل الخروج' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header 
          className="h-16 border-b flex items-center px-6"
          style={{ backgroundColor: 'var(--tenant-surface)', borderColor: 'var(--tenant-border)' }}
        >
          <div className={`flex items-center gap-4 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--tenant-text-secondary)' }}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2">
              <span 
                className="px-2 py-1 text-xs font-bold rounded"
                style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--tenant-accent)' }}
              >
                ADMIN
              </span>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--tenant-text)' }}>
                {isRTL ? 'لوحة إدارة المؤسسة' : 'Tenant Administration'}
              </h2>
            </div>
          </div>

          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="text-sm" style={{ color: 'var(--tenant-text-secondary)' }}>
              {user?.email || 'Admin User'}
            </div>
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: 'var(--tenant-accent)' }}
            >
              {user?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
