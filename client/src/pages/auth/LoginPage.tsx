import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, AlertCircle, Loader2, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { needsBranchSelection, setActiveBranch } from '@/hooks/useActiveBranch';

/**
 * SeamlessVideo - Crossfade looping video with two alternating elements.
 * Eliminates the visible restart jump by fading between two video instances.
 */
function SeamlessVideo({ className }: { className?: string }) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeVideo, setActiveVideo] = useState<'A' | 'B'>('A');
  const fadeDuration = 1.2; // seconds before end to start crossfade
  const isTransitioning = useRef(false);

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (!video.duration || isTransitioning.current) return;

    const timeLeft = video.duration - video.currentTime;
    if (timeLeft <= fadeDuration && timeLeft > 0) {
      isTransitioning.current = true;
      const nextVideo = activeVideo === 'A' ? videoBRef.current : videoARef.current;
      if (nextVideo) {
        nextVideo.currentTime = 0;
        nextVideo.play().catch(() => {});
      }
      setActiveVideo(prev => prev === 'A' ? 'B' : 'A');
    }
  }, [activeVideo]);

  const handleEnded = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    e.currentTarget.pause();
    isTransitioning.current = false;
  }, []);

  useEffect(() => {
    if (videoARef.current) {
      videoARef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <video
        ref={videoARef}
        muted
        playsInline
        onTimeUpdate={activeVideo === 'A' ? handleTimeUpdate : undefined}
        onEnded={handleEnded}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: activeVideo === 'A' ? 1 : 0,
          transition: `opacity ${fadeDuration}s ease-in-out`,
        }}
      >
        <source src="/assets/login_page_1.mp4" type="video/mp4" />
      </video>
      <video
        ref={videoBRef}
        muted
        playsInline
        onTimeUpdate={activeVideo === 'B' ? handleTimeUpdate : undefined}
        onEnded={handleEnded}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: activeVideo === 'B' ? 1 : 0,
          transition: `opacity ${fadeDuration}s ease-in-out`,
        }}
      >
        <source src="/assets/login_page_1.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

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
  const { t } = useTranslation();
  const [mobileShowForm, setMobileShowForm] = useState(false);

  // Slide gesture state
  const slideRef = useRef<HTMLDivElement>(null);
  const [slideStartY, setSlideStartY] = useState<number | null>(null);
  const [slideOffset, setSlideOffset] = useState(0);

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

      // Check if user needs to pick a branch (2+ branches, first time this session)
      const userForBranch = {
        branchId: user.branchId,
        allowedBranchIds: user.allowedBranchIds || [],
      };

      if (needsBranchSelection(userForBranch)) {
        navigate('/select-branch');
        return;
      }

      // Single-branch user: auto-set active branch
      if (user.branchId) {
        const defaultBranch = user.branches?.find((b: { id: string }) => b.id === user.branchId);
        setActiveBranch(user.branchId, defaultBranch?.name || '');
      } else if (user.branches?.length === 1) {
        // Tenant admin with single branch (no branchId assigned): auto-select
        setActiveBranch(user.branches[0].id, user.branches[0].name);
      }

      const dashboardPath = getScopeDashboardPath(user.accessScope);
      navigate(dashboardPath);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Slide gesture handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setSlideStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (slideStartY === null) return;
    const diff = slideStartY - e.touches[0].clientY;
    if (diff > 0) {
      setSlideOffset(Math.min(diff, 120));
    }
  };

  const handleTouchEnd = () => {
    if (slideOffset > 60) {
      setMobileShowForm(true);
    }
    setSlideOffset(0);
    setSlideStartY(null);
  };

  const isFormValid = tenantCode.trim() !== '' && email.trim() !== '' && password.trim() !== '';

  const loginForm = (
    <Card className="shadow-xl" style={{ borderColor: 'var(--color-border)' }}>
      <CardHeader className="space-y-1 pb-6">
        <CardTitle
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          {t('auth.welcomeBack')}
        </CardTitle>
        <CardDescription>
          {t('auth.signInToContinue')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              className="p-4 rounded-lg border flex items-start gap-3"
              style={{
                backgroundColor: 'var(--alert-danger-bg)',
                borderColor: 'var(--alert-danger-border)',
              }}
            >
              <AlertCircle
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{ color: 'var(--color-danger)' }}
              />
              <p
                className="text-sm"
                style={{ color: 'var(--alert-danger-text)' }}
              >
                {error}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="tenantCode"
              className="text-sm font-medium block"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('auth.tenantCode')}
            </Label>
            <div className="relative">
              <div
                className="absolute start-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <Input
                id="tenantCode"
                type="text"
                placeholder={t('auth.enterTenantCode')}
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                className="ps-10 focus:scale-[1.01] transition-all duration-200"
                aria-label="Tenant Code"
                autoComplete="organization"

              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium block"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('auth.emailAddress')}
            </Label>
            <div className="relative">
              <div
                className="absolute start-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Mail className="w-5 h-5" />
              </div>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ps-10 focus:scale-[1.01] transition-all duration-200"
                aria-label="Email Address"
                autoComplete="email"

              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium block"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('auth.password')}
            </Label>
            <div className="relative">
              <div
                className="absolute start-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Lock className="w-5 h-5" />
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.enterPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ps-10 pe-10 focus:scale-[1.01] transition-all duration-200"
                aria-label="Password"
                autoComplete="current-password"

              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {capsLockOn && (
              <div
                className="flex items-center gap-2 text-sm mt-1.5"
                style={{ color: 'var(--color-warning)' }}
              >
                <AlertCircle className="w-4 h-4" />
                <span>{t('auth.capsLockOn')}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm justify-end">
            <a
              href="#"
              className="transition-colors hover:opacity-70"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={(e) => e.preventDefault()}
            >
              {t('auth.needHelp')}
            </a>
            <a
              href="#"
              className="font-medium transition-colors hover:opacity-70"
              style={{ color: 'var(--color-accent)' }}
              onClick={(e) => e.preventDefault()}
            >
              {t('auth.forgotPassword')}
            </a>
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isFormValid || isLoading}
            aria-label="Sign in to your account"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('auth.signingIn')}</span>
              </span>
            ) : (
              t('auth.signIn')
            )}
          </Button>

          <Separator className="my-6" />

          <div className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <p>{t('auth.secureAuth')}</p>
          </div>
        </form>

        <div data-testid="agi-hook" className="hidden" aria-hidden="true" />
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* ===== DESKTOP LAYOUT: Video left, Form right ===== */}
      <div className="hidden lg:flex min-h-screen flex-row">
        {/* Video Panel */}
        <div className="lg:w-1/2 relative overflow-hidden">
          <SeamlessVideo className="absolute inset-0 w-full h-full" />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.1) 100%)',
            }}
          />
          {/* Branding on video */}
          <div className="absolute bottom-0 left-0 right-0 p-10 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 backdrop-blur-md rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{t('auth.veterinaryErp')}</h1>
                <p className="text-xs text-white/70">{t('auth.enterprisePlatform')}</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('auth.enterpriseGrade')}
            </h2>
            <p className="text-sm text-white/70 max-w-md">
              {t('auth.multiTenantDesc')}
            </p>
          </div>
        </div>

        {/* Form Panel */}
        <div className="lg:w-1/2 flex items-center justify-center p-12">
          <div className="w-full max-w-md">
            {loginForm}
            <div className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p>{t('auth.protectedBy')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE LAYOUT: Fullscreen video -> slide to reveal form ===== */}
      <div className="lg:hidden min-h-screen relative">
        {!mobileShowForm ? (
          /* Video fullscreen with slide-to-login overlay */
          <div className="fixed inset-0 z-50">
            <SeamlessVideo className="absolute inset-0 w-full h-full" />
            {/* Dark gradient at bottom */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)',
              }}
            />

            {/* Brand + Slide to Login */}
            <div
              ref={slideRef}
              className="absolute bottom-0 left-0 right-0 p-6 pb-10 z-10 flex flex-col items-center"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: `translateY(-${slideOffset}px)`,
                transition: slideStartY !== null ? 'none' : 'transform 0.3s ease-out',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 backdrop-blur-md rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">{t('auth.veterinaryErp')}</h1>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white text-center mb-2">
                {t('auth.enterpriseGrade')}
              </h2>
              <p className="text-sm text-white/60 text-center mb-8 max-w-xs">
                {t('auth.multiTenantDesc')}
              </p>

              {/* Slide to Login button */}
              <button
                onClick={() => setMobileShowForm(true)}
                className="w-full max-w-xs relative overflow-hidden rounded-2xl py-4 px-6 flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
              >
                <ChevronUp className="w-5 h-5 text-white animate-bounce" />
                <span className="text-white font-medium text-sm">
                  {t('auth.slideToLogin')}
                </span>
                <ChevronUp className="w-5 h-5 text-white animate-bounce" />
              </button>

              <p className="text-xs text-white/40 mt-3">
                {t('auth.swipeUp')}
              </p>
            </div>
          </div>
        ) : (
          /* Mobile login form with mini video header */
          <div
            className="min-h-screen flex flex-col"
            style={{ backgroundColor: 'var(--color-bg)' }}
          >
            {/* Mini video header */}
            <div className="relative h-48 overflow-hidden flex-shrink-0">
              <SeamlessVideo className="absolute inset-0 w-full h-full" />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, var(--color-bg) 0%, rgba(0,0,0,0.3) 100%)' }}
              />
              {/* Back button to video */}
              <button
                onClick={() => setMobileShowForm(false)}
                className="absolute top-4 left-4 z-10 p-2 rounded-full backdrop-blur-md"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <ChevronUp className="w-5 h-5 text-white rotate-180" />
              </button>
              <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-2">
                <Building2 className="w-5 h-5 text-white" />
                <span className="text-white font-bold">{t('auth.veterinaryErp')}</span>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 p-6 -mt-4">
              {loginForm}
              <div className="mt-4 text-center text-sm pb-6" style={{ color: 'var(--color-text-secondary)' }}>
                <p>{t('auth.protectedBy')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
