import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { I18nProvider } from './providers/I18nProvider';
import { SocketProvider } from './providers/SocketProvider';
import { AuthProvider } from './contexts/AuthContext';
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
 * - Authentication (Phase 3)
 */
function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <SocketProvider>
              <AppRouter />
            </SocketProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default App;
