import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

/**
 * COLOR STRATEGY (Hybrid Approach):
 * - Brand Colors (buttons, links, focus, decorative): #2563EB, #1E40AF, #60A5FA, #18AC61, #9CA3AF, #F3F4F6, #FFFFFF
 * - Theme Variables (text, borders, warnings): var(--color-text), var(--color-text-secondary), var(--color-border), var(--color-warning)
 */

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

  // RTL Detection
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

  // Caps Lock Detection
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(tenantCode, email, password);
      // Redirect to dashboard on successful login
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = tenantCode.trim() !== '' && email.trim() !== '' && password.trim() !== '';

  return (
    <div className={`min-h-screen bg-[#F3F4F6] flex ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Left Side - Branding & Illustration (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#2563EB] via-[#1E40AF] to-[#1E40AF] p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-96 h-96 bg-white rounded-full blur-3xl`} />
          <div className={`absolute bottom-0 ${isRTL ? 'left-0' : 'right-0'} w-96 h-96 bg-white rounded-full blur-3xl`} />
        </div>

        {/* Logo & Brand */}
        <div className="relative z-10">
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h1 className="text-2xl font-bold text-white">Veterinary ERP</h1>
              <p className="text-sm text-white/80">Enterprise Multi-Tenant Platform</p>
            </div>
          </div>
        </div>

        {/* Center Illustration Area */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="w-64 h-64 mx-auto bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center">
              <Building2 className="w-32 h-32 text-white/80" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Enterprise-Grade Platform
              </h2>
              <p className="text-lg text-white/80 max-w-md mx-auto">
                Multi-tenant veterinary management system with real-time capabilities and AI integration
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-sm text-white/60">
            © 2025 Veterinary ERP. Enterprise Multi-Tenant SaaS Platform
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className={`inline-flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Veterinary ERP</h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Enterprise Multi-Tenant Platform</p>
          </div>

          {/* Login Card */}
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
                {/* Error Message */}
                {error && (
                  <div className={`p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className={`text-sm text-red-800 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>
                  </div>
                )}

                {/* Tenant Code Field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="tenantCode" 
                    className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'} block`}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Tenant Code
                  </Label>
                  <div className="relative">
                    <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} style={{ color: '#9CA3AF' }}>
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

                {/* Email Field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="email" 
                    className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'} block`}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} style={{ color: '#9CA3AF' }}>
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

                {/* Password Field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="password" 
                    className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'} block`}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} style={{ color: '#9CA3AF' }}>
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
                      className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 transition-colors`}
                      style={{ color: '#9CA3AF' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#2563EB'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Caps Lock Warning */}
                  {capsLockOn && (
                    <div className={`flex items-center gap-2 text-sm mt-1.5 ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: 'var(--color-warning)' }}>
                      <AlertCircle className="w-4 h-4" />
                      <span>Caps Lock is on</span>
                    </div>
                  )}
                </div>

                {/* Forgot Password & Help Links */}
                <div className={`flex items-center gap-4 text-sm ${isRTL ? 'justify-start' : 'justify-end'}`}>
                  <a
                    href="#"
                    className="text-[#9CA3AF] hover:text-[#2563EB] transition-colors"
                    onClick={(e) => e.preventDefault()}
                  >
                    {isRTL ? 'هل تحتاج مساعدة؟' : 'Need help?'}
                  </a>
                  <a
                    href="#"
                    className="text-[#2563EB] hover:text-[#1E40AF] font-medium transition-colors"
                    onClick={(e) => e.preventDefault()}
                  >
                    {isRTL ? 'هل نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </a>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#2563EB] hover:bg-[#1E40AF] text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isFormValid || isLoading}
                  aria-label="Sign in to your account"
                >
                  {isLoading ? (
                    <span className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>{isRTL ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span>
                    </span>
                  ) : (
                    isRTL ? 'تسجيل الدخول' : 'Sign In'
                  )}
                </Button>

                <Separator className="my-6" />

                {/* Additional Info */}
                <div className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <p>{isRTL ? 'مصادقة آمنة على مستوى المؤسسة' : 'Secure enterprise authentication'}</p>
                </div>
              </form>

              {/* AGI Hook - Future Integration Point */}
              <div data-testid="agi-hook" className="hidden" aria-hidden="true" />
            </CardContent>
          </Card>

          {/* Footer Note */}
          <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <p>{isRTL ? 'محمي بأمان من الدرجة المؤسسية' : 'Protected by enterprise-grade security'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
