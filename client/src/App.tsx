import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { I18nProvider } from './providers/I18nProvider';
import { SocketProvider } from './providers/SocketProvider';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <ThemeProvider>
          <I18nProvider>
            <SocketProvider>
              <AppRoutes />
            </SocketProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}

export default App;
