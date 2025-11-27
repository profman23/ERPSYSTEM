import { Navigate, useLocation } from 'react-router-dom';

interface LegacyRedirectProps {
  baseFrom: string;
  baseTo: string;
}

export default function LegacyRedirect({ baseFrom, baseTo }: LegacyRedirectProps) {
  const location = useLocation();
  const pathAfterBase = location.pathname.substring(baseFrom.length);
  const newPath = baseTo + pathAfterBase + location.search + location.hash;
  return <Navigate to={newPath} replace />;
}
