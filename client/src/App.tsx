import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { I18nProvider } from './providers/I18nProvider';
import { SocketProvider } from './providers/SocketProvider';
import { AuthProvider } from './contexts/AuthContext';
import { InterfaceStyleProvider } from './contexts/InterfaceStyleContext';
import { UserStyleProvider } from './contexts/UserStyleContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './components/ui/toast';
import AppRouter from './routes/AppRouter';

/**
 * App Component - Root application component
 *
 * Features:
 * - React Router v6 with createBrowserRouter
 * - React Query for data fetching
 * - i18n support (Arabic RTL + English)
 * - Socket.IO real-time capabilities
 * - Theme management
 * - Interface style management (Default / Playful / Elegant)
 * - Authentication (Phase 3)
 */
function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <InterfaceStyleProvider>
          <UserStyleProvider>
            <I18nProvider>
              <LanguageProvider>
              <AuthProvider>
                <SocketProvider>
                  <ToastProvider>
                    <AppRouter />
                  </ToastProvider>
                </SocketProvider>
              </AuthProvider>
              </LanguageProvider>
            </I18nProvider>
          </UserStyleProvider>
        </InterfaceStyleProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default App;
