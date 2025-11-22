import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  GitBranch, 
  Briefcase,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

/**
 * DashboardLayout - Enterprise dashboard layout with sidebar navigation
 * Used for: All protected application routes
 * 
 * Features:
 * - Responsive sidebar (collapsible on mobile)
 * - Top header with branding
 * - Active route highlighting
 * - RTL-ready navigation
 * - Breadcrumb support
 */
export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const location = useLocation();

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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, nameAr: 'لوحة التحكم' },
    { name: 'Tenants', href: '/tenants', icon: Building2, nameAr: 'العملاء' },
    { name: 'Business Lines', href: '/business-lines', icon: Briefcase, nameAr: 'خطوط الأعمال' },
    { name: 'Branches', href: '/branches', icon: GitBranch, nameAr: 'الفروع' },
    { name: 'Users', href: '/users', icon: Users, nameAr: 'المستخدمين' },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`min-h-screen bg-[#F3F4F6] flex ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Sidebar */}
      <aside
        className={`
          ${isSidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
          ${isMobile ? 'fixed inset-y-0 z-50 w-64' : 'relative w-64'}
          bg-white border-gray-200
          ${isRTL ? 'border-l' : 'border-r'}
          transition-transform duration-300 ease-in-out
          flex flex-col
        `}
      >
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center px-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                {isRTL ? 'نظام ERP البيطري' : 'Veterinary ERP'}
              </h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
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
                  ${active 
                    ? 'bg-[#2563EB] text-white' 
                    : 'hover:bg-gray-100'
                  }
                `}
                style={!active ? { color: 'var(--color-text-secondary)' } : {}}
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

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL ? 'الإصدار 1.0.0' : 'Version 1.0.0'}
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
          <div className={`flex items-center gap-4 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Mobile Menu Toggle */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Page Title */}
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              {isRTL ? 'لوحة التحكم' : 'Dashboard'}
            </h2>
          </div>

          {/* Header Actions */}
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'مستخدم تجريبي' : 'Demo User'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
