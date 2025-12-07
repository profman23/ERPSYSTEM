import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar,
  Stethoscope,
  ClipboardList,
  FileText,
  Menu,
  X,
  LogOut,
  Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function UserAppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-panel', 'app');
    return () => {
      document.documentElement.removeAttribute('data-panel');
    };
  }, []);

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
    { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, nameAr: 'لوحة التحكم' },
    { name: 'Appointments', href: '/app/appointments', icon: Calendar, nameAr: 'المواعيد' },
    { name: 'Patients', href: '/app/patients', icon: Stethoscope, nameAr: 'المرضى' },
    { name: 'Tasks', href: '/app/tasks', icon: ClipboardList, nameAr: 'المهام' },
    { name: 'Reports', href: '/app/reports', icon: FileText, nameAr: 'التقارير' },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/app/dashboard') {
      return location.pathname === '/app/dashboard' || location.pathname === '/app';
    }
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`min-h-screen flex bg-panel ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      <aside
        className={`
          ${isSidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
          ${isMobile ? 'fixed inset-y-0 z-50 w-60' : 'relative w-60'}
          transition-transform duration-300 ease-in-out
          flex flex-col bg-surface border-panel shadow-sm
          ${isRTL ? 'border-l' : 'border-r'}
        `}
      >
        <div className={`h-16 flex items-center px-5 border-b border-panel ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-sm font-bold text-panel">
                {isRTL ? 'العيادة البيطرية' : 'Vet Clinic'}
              </h1>
              <p className="text-xs text-muted">
                {user?.role || 'Staff'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => isMobile && setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isRTL ? 'flex-row-reverse' : ''}
                  ${active ? 'sidebar-item-active shadow-md' : 'sidebar-item'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{isRTL ? item.nameAr : item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-panel">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium sidebar-item transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>{isRTL ? 'تسجيل الخروج' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 modal-overlay z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-panel flex items-center px-6 bg-surface shadow-sm">
          <div className={`flex items-center gap-4 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg btn-ghost transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <h2 className="text-lg font-semibold text-panel">
              {isRTL ? 'مرحباً' : 'Welcome'}, {user?.name || 'User'}
            </h2>
          </div>

          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button className="p-2 rounded-lg btn-ghost transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-danger)' }}></span>
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold bg-accent">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-panel">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
