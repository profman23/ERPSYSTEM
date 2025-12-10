import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [tenantCode, setTenantCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    const checkRTL = () => {
      const dir = document.documentElement.getAttribute('dir') || document.dir || 'ltr';
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.getModifierState && e.getModifierState('CapsLock')) {
        setCapsLockOn(true);
      } else {
        setCapsLockOn(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.getModifierState && !e.getModifierState('CapsLock')) {
        setCapsLockOn(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getScopeDashboardPath = (accessScope: string): string => {
    switch (accessScope) {
      case 'system':
        return '/system/dashboard';
      case 'tenant':
        return '/admin/dashboard';
      case 'business_line':
      case 'branch':
      case 'mixed':
      default:
        return '/app/dashboard';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await login(tenantCode, email, password);
      const dashboardPath = getScopeDashboardPath(user.accessScope);
      navigate(dashboardPath);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = tenantCode.trim() !== '' && email.trim() !== '' && password.trim() !== '';

  return (
    <div 
      className={`min-h-screen flex ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div 
        className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-active))' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-96 h-96 rounded-full blur-3xl`} style={{ backgroundColor: 'var(--color-surface)' }} />
          <div className={`absolute bottom-0 ${isRTL ? 'left-0' : 'right-0'} w-96 h-96 rounded-full blur-3xl`} style={{ backgroundColor: 'var(--color-surface)' }} />
        </div>

        <div className="relative z-10">
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div 
              className="w-12 h-12 backdrop-blur-sm rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Building2 className="w-7 h-7" style={{ color: 'var(--color-text-on-accent)' }} />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-on-accent)' }}>Veterinary ERP</h1>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Enterprise Multi-Tenant Platform</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div 
              className="w-64 h-64 mx-auto backdrop-blur-sm rounded-3xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <Building2 className="w-32 h-32" style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-text-on-accent)' }}>
                Enterprise-Grade Platform
              </h2>
              <p className="text-lg max-w-md mx-auto" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Multi-tenant veterinary management system with real-time capabilities and AI integration
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            © 2025 Veterinary ERP. Enterprise Multi-Tenant SaaS Platform
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className={`inline-flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <Building2 className="w-6 h-6" style={{ color: 'var(--color-text-on-accent)' }} />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Veterinary ERP</h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Enterprise Multi-Tenant Platform</p>
          </div>

          <Card className="shadow-xl" style={{ borderColor: 'var(--color-border)' }}>
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: 'var(--color-text)' }}>
                Welcome Back
              </CardTitle>
              <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                Sign in to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div 
                    className={`p-4 rounded-lg border flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{
                      backgroundColor: 'var(--alert-danger-bg)',
                      borderColor: 'var(--alert-danger-border)'
                    }}
                  >
                    <AlertCircle 
                      className="w-5 h-5 flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--color-danger)' }}
                    />
                    <p 
                      className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--alert-danger-text)' }}
                    >
                      {error}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label 
                    htmlFor="tenantCode" 
                    className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'} block`}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Tenant Code
                  </Label>
                  <div className="relative">
                    <div 
                      className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} 
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <Input
                      id="tenantCode"
                      type="text"
                      placeholder="Enter your tenant code"
                      value={tenantCode}
                      onChange={(e) => setTenantCode(e.target.value)}
                      className={`${isRTL ? 'pr-10 text-right' : 'pl-10'} focus:scale-[1.01] transition-all duration-200`}
                      aria-label="Tenant Code"
                      autoComplete="organization"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label 
                    htmlFor="email" 
                    className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'} block`}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <div 
                      className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} 
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Mail className="w-5 h-5" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${isRTL ? 'pr-10 text-right' : 'pl-10'} focus:scale-[1.01] transition-all duration-200`}
                      aria-label="Email Address"
                      autoComplete="email"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label 
                    htmlFor="password" 
                    className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'} block`}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <div 
                      className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} 
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Lock className="w-5 h-5" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${isRTL ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10'} focus:scale-[1.01] transition-all duration-200`}
                      aria-label="Password"
                      autoComplete="current-password"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 transition-colors hover:opacity-70`}
                      style={{ color: 'var(--color-text-muted)' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {capsLockOn && (
                    <div 
                      className={`flex items-center gap-2 text-sm mt-1.5 ${isRTL ? 'flex-row-reverse' : ''}`} 
                      style={{ color: 'var(--color-warning)' }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Caps Lock is on</span>
                    </div>
                  )}
                </div>

                <div className={`flex items-center gap-4 text-sm ${isRTL ? 'justify-start' : 'justify-end'}`}>
                  <a
                    href="#"
                    className="transition-colors hover:opacity-70"
                    style={{ color: 'var(--color-text-muted)' }}
                    onClick={(e) => e.preventDefault()}
                  >
                    {isRTL ? 'هل تحتاج مساعدة؟' : 'Need help?'}
                  </a>
                  <a
                    href="#"
                    className="font-medium transition-colors hover:opacity-70"
                    style={{ color: 'var(--color-accent)' }}
                    onClick={(e) => e.preventDefault()}
                  >
                    {isRTL ? 'هل نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </a>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isFormValid || isLoading}
                  aria-label="Sign in to your account"
                >
                  {isLoading ? (
                    <span className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{isRTL ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span>
                    </span>
                  ) : (
                    isRTL ? 'تسجيل الدخول' : 'Sign In'
                  )}
                </Button>

                <Separator className="my-6" />

                <div className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <p>{isRTL ? 'مصادقة آمنة على مستوى المؤسسة' : 'Secure enterprise authentication'}</p>
                </div>
              </form>

              <div data-testid="agi-hook" className="hidden" aria-hidden="true" />
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <p>{isRTL ? 'محمي بأمان من الدرجة المؤسسية' : 'Protected by enterprise-grade security'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
