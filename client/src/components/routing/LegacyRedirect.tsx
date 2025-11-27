import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getScopeBasePath } from '@/hooks/useScopePath';

interface LegacyRedirectProps {
  baseFrom: string;
  resource: string;
}

export default function LegacyRedirect({ baseFrom, resource }: LegacyRedirectProps) {
  const location = useLocation();
  const { user } = useAuth();
  
  const pathAfterBase = location.pathname.substring(baseFrom.length);
  
  const scopeBasePath = getScopeBasePath(user?.accessScope);
  const scopeAwareTo = `${scopeBasePath}/${resource}`;
  
  const newPath = scopeAwareTo + pathAfterBase + location.search + location.hash;
  return <Navigate to={newPath} replace />;
}
