import { Link } from 'react-router-dom';
import { Home, ArrowLeft, AlertCircle, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <Card className="max-w-lg w-full shadow-xl">
        <CardContent className="pt-12 pb-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-danger-bg-light)' }}
              >
                <AlertCircle className="w-10 h-10" style={{ color: 'var(--color-danger)' }} />
              </div>
            </div>

            <div>
              <h1 className="text-6xl font-bold mb-2 flex items-center justify-center gap-3" style={{ color: 'var(--color-text)' }}>
                <SearchX className="w-16 h-16 text-[var(--color-text-muted)]" /> 404
              </h1>
              <h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                {t('errors.pageNotFound')}
              </h2>
              <p className="text-base max-w-md mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                {t('errors.pageNotFoundDesc')}
              </p>
            </div>

            <div className={`flex flex-col sm:flex-row gap-3 justify-center ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
              <Link to="/dashboard">
                <Button 
                  className="w-full sm:w-auto"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
                >
                  <Home className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('errors.goToDashboard')}
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
                  {t('errors.goBack')}
                </Button>
              </Link>
            </div>

            <div className="pt-6" style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {t('errors.contactSupport')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
