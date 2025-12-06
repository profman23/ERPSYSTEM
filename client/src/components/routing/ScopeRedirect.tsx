import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ScopeRedirect() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const accessScope = user.accessScope || 'branch';
    
    switch (accessScope) {
      case 'system':
        navigate('/system/dashboard', { replace: true });
        break;
      case 'tenant':
        navigate('/admin/dashboard', { replace: true });
        break;
      case 'business_line':
      case 'branch':
      case 'mixed':
      default:
        navigate('/app/dashboard', { replace: true });
        break;
    }
  }, [user, isLoading, navigate]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
        <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
