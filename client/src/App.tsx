import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { I18nProvider } from './providers/I18nProvider';
import { SocketProvider } from './providers/SocketProvider';
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
 */
function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <I18nProvider>
          <SocketProvider>
            <AppRouter />
          </SocketProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default App;
