/**
 * MyProfilePage — User profile settings
 *
 * 5 sections:
 * 1. Personal Information — name, avatar upload
 * 2. Interface Style — Default / Playful / Elegant
 * 3. Theme Mode — Dark / Light
 * 4. Display Preferences — background pattern + color pickers
 * 5. Language — English / Arabic
 */

import { useState, useRef } from 'react';
import {
  User,
  Camera,
  Palette,
  Sun,
  Moon,
  Sparkles,
  Gem,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Paintbrush,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/providers/ThemeProvider';
import { useInterfaceStyle, type InterfaceStyle } from '@/contexts/InterfaceStyleContext';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { StyledIcon } from '@/components/ui/StyledIcon';
import { cn } from '@/lib/utils';
import { useUpdateProfile } from '@/hooks/useProfile';
import { userProfileSchema } from '@/validations/userSchema';
import { Switch } from '@/components/ui/switch';
import { useUserStylePreferences, useUpdateUserStyle } from '@/hooks/useUserStyle';
import { THEME_COLOR_PRESETS, type ThemeColorId } from '@/config/userStylePresets';

// ═══════════════════════════════════════════════════════════════
// STYLE OPTIONS
// ═══════════════════════════════════════════════════════════════

const STYLE_OPTIONS: {
  id: InterfaceStyle;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: typeof Palette;
  emoji: string;
  preview: string;
  gradient: string;
}[] = [
  {
    id: 'default',
    name: 'Default',
    nameAr: 'الافتراضي',
    description: 'Clean professional interface with standard icons',
    descriptionAr: 'واجهة احترافية نظيفة مع أيقونات قياسية',
    icon: Palette,
    emoji: '🎨',
    preview: 'Aa',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'playful',
    name: 'Playful',
    nameAr: 'مرح',
    description: 'Fun emojis replace all icons — colorful and expressive',
    descriptionAr: 'إيموجيز ممتعة تحل محل جميع الأيقونات — ملونة ومعبرة',
    icon: Sparkles,
    emoji: '🎉',
    preview: '🎉',
    gradient: 'from-pink-500 to-orange-400',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    nameAr: 'أنيق',
    description: 'Refined minimalist style with thin elegant icons',
    descriptionAr: 'نمط بسيط وراقي مع أيقونات رفيعة أنيقة',
    icon: Gem,
    emoji: '💎',
    preview: 'Ag',
    gradient: 'from-violet-500 to-purple-600',
  },
];

// ═══════════════════════════════════════════════════════════════
// LANGUAGE OPTIONS
// ═══════════════════════════════════════════════════════════════

const LANGUAGE_OPTIONS: {
  id: Language;
  name: string;
  nativeName: string;
  description: string;
  gradient: string;
  flag: string;
}[] = [
  {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    description: 'English interface (LTR)',
    gradient: 'from-blue-500 to-cyan-500',
    flag: '🇬🇧',
  },
  {
    id: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    description: 'واجهة عربية (RTL)',
    gradient: 'from-emerald-500 to-green-600',
    flag: '🇸🇦',
  },
];

/** Reusable row: label + 3 color swatches */
function ColorPickerRow({ label, description, value, onChange, isRTL }: {
  label: string;
  description?: string;
  value: ThemeColorId;
  onChange: (id: ThemeColorId) => void;
  isRTL: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      {description && <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{description}</p>}
      <div className="flex gap-3">
        {(Object.keys(THEME_COLOR_PRESETS) as ThemeColorId[]).map((id) => {
          const preset = THEME_COLOR_PRESETS[id];
          const isActive = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 cursor-pointer',
                isActive ? 'shadow-sm' : 'hover:shadow-sm'
              )}
              style={{
                backgroundColor: isActive ? 'var(--color-accent-light, rgba(59,130,246,0.08))' : 'var(--color-surface)',
                borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
              }}
            >
              <div
                className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: preset.hex || 'var(--color-surface-hover)',
                  borderColor: preset.hex ? 'transparent' : 'var(--color-border)',
                }}
              >
                {isActive && <Check className="w-3 h-3" style={{ color: preset.hex ? (id === 'bright-cyan' ? '#1F2937' : '#FFFFFF') : 'var(--color-accent)' }} />}
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                {isRTL ? preset.nameAr : preset.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { interfaceStyle, setInterfaceStyle } = useInterfaceStyle();
  const { language, setLanguage, isRTL } = useLanguage();
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();
  const prefs = useUserStylePreferences();
  const { mutate: updateStyle } = useUpdateUserStyle();

  // Split combined name into firstName/lastName
  const nameParts = (user?.name || '').split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userName = user?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return; // 2MB max
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setValidationErrors({});
    setSaveStatus('idle');

    // Validate with Zod
    const result = userProfileSchema.safeParse({ firstName, lastName });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      }
      setValidationErrors(errors);
      return;
    }

    try {
      await updateProfile.mutateAsync({ firstName, lastName });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <StyledIcon icon={User} emoji="👤" className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          {t('profile.title')}
        </h1>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: Personal Information */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <StyledIcon icon={User} emoji="👤" className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {t('profile.personalInfo')}
          </h2>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-2 cursor-pointer group"
                style={{ borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-surface-hover)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>
                    {userInitial}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('profile.clickToChange')}
              </span>
            </div>

            {/* Name Fields */}
            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-firstName" className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={User} emoji="👤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('profile.firstName')}
                  </Label>
                  <Input
                    id="profile-firstName"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setValidationErrors(prev => ({ ...prev, firstName: '' })); }}
                    placeholder={t('profile.firstName')}
                    className={validationErrors.firstName ? 'border-red-500' : ''}
                  />
                  {validationErrors.firstName && (
                    <p className="text-xs text-red-500">{validationErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-lastName" className="text-xs flex items-center gap-1.5">
                    <StyledIcon icon={User} emoji="👤" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    {t('profile.lastName')}
                  </Label>
                  <Input
                    id="profile-lastName"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setValidationErrors(prev => ({ ...prev, lastName: '' })); }}
                    placeholder={t('profile.lastName')}
                    className={validationErrors.lastName ? 'border-red-500' : ''}
                  />
                  {validationErrors.lastName && (
                    <p className="text-xs text-red-500">{validationErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <StyledIcon icon={User} emoji="📧" className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {t('profile.email')}
                </Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="opacity-60"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                  {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('profile.saveChanges')}
                </Button>
                {saveStatus === 'success' && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('profile.savedSuccess')}
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="flex items-center gap-1 text-sm text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    {t('profile.saveFailed')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: Interface Style */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <StyledIcon icon={Palette} emoji="🎨" className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {t('profile.interfaceStyle')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STYLE_OPTIONS.map((opt) => {
              const isActive = interfaceStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInterfaceStyle(opt.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer group',
                    isActive
                      ? 'scale-[1.02] shadow-lg'
                      : 'hover:scale-[1.01] hover:shadow-md'
                  )}
                  style={{
                    backgroundColor: isActive ? 'var(--color-accent-light, rgba(59,130,246,0.08))' : 'var(--color-surface)',
                    borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                  }}
                >
                  {/* Selected indicator */}
                  {isActive && (
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  {/* Preview circle */}
                  <div className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-gradient-to-br text-white shadow-md transition-transform duration-300',
                    opt.gradient,
                    isActive ? 'scale-110' : 'group-hover:scale-105'
                  )}>
                    {opt.id === 'playful' ? opt.preview : (
                      <opt.icon className="w-7 h-7" strokeWidth={opt.id === 'elegant' ? 1.25 : 2} />
                    )}
                  </div>

                  {/* Label */}
                  <div className="text-center">
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      {isRTL ? opt.nameAr : opt.name}
                    </p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                      {isRTL ? opt.descriptionAr : opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: Theme Mode */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <StyledIcon icon={Sun} emoji="☀️" className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {t('profile.themeMode')}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Light Mode */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={cn(
                'flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer',
                theme === 'light' ? 'scale-[1.02] shadow-lg' : 'hover:scale-[1.01] hover:shadow-md'
              )}
              style={{
                backgroundColor: theme === 'light' ? 'var(--color-accent-light, rgba(59,130,246,0.08))' : 'var(--color-surface)',
                borderColor: theme === 'light' ? 'var(--color-accent)' : 'var(--color-border)',
              }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
                <Sun className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {t('profile.light')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('profile.brightInterface')}
                </p>
              </div>
              {theme === 'light' && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>

            {/* Dark Mode */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={cn(
                'flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer',
                theme === 'dark' ? 'scale-[1.02] shadow-lg' : 'hover:scale-[1.01] hover:shadow-md'
              )}
              style={{
                backgroundColor: theme === 'dark' ? 'var(--color-accent-light, rgba(59,130,246,0.08))' : 'var(--color-surface)',
                borderColor: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-border)',
              }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-700 shadow-md">
                <Moon className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {t('profile.dark')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('profile.darkInterface')}
                </p>
              </div>
              {theme === 'dark' && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: Display Preferences */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <StyledIcon icon={Paintbrush} emoji="🎨" className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {t('customize.title')}
          </h2>

          {/* Background Pattern Toggle */}
          <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t('customize.backgroundPattern')}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('customize.showPattern')}</p>
            </div>
            <Switch
              checked={prefs.showBackgroundPattern}
              onCheckedChange={(checked: boolean) => updateStyle({ showBackgroundPattern: checked })}
            />
          </div>

          {/* Color Pickers */}
          <div className="space-y-5">
            <ColorPickerRow label={t('customize.accentColor')} description={t('customize.accentColorDesc')} value={prefs.accentColor} onChange={(v) => updateStyle({ accentColor: v })} isRTL={isRTL} />
            {theme === 'light' && (
              <>
                <ColorPickerRow label={t('customize.headerBackground')} value={prefs.headerColor} onChange={(v) => updateStyle({ headerColor: v })} isRTL={isRTL} />
                <ColorPickerRow label={t('customize.sidebarBackground')} value={prefs.sidebarColor} onChange={(v) => updateStyle({ sidebarColor: v })} isRTL={isRTL} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: Language */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <StyledIcon icon={Globe} emoji="🌍" className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
            {t('profile.language')}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {LANGUAGE_OPTIONS.map((opt) => {
              const isActive = language === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLanguage(opt.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer',
                    isActive ? 'scale-[1.02] shadow-lg' : 'hover:scale-[1.01] hover:shadow-md'
                  )}
                  style={{
                    backgroundColor: isActive ? 'var(--color-accent-light, rgba(59,130,246,0.08))' : 'var(--color-surface)',
                    borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                  }}
                >
                  {/* Selected indicator */}
                  {isActive && (
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  {/* Flag / Globe */}
                  <div className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br text-white shadow-md transition-transform duration-300',
                    opt.gradient,
                    isActive ? 'scale-110' : ''
                  )}>
                    <Globe className="w-7 h-7" />
                  </div>

                  {/* Label */}
                  <div className="text-center">
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      {opt.nativeName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
