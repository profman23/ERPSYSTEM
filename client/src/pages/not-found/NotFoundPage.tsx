import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFoundPage() {
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    const checkRTL = () => {
      const dir = document.documentElement.getAttribute('dir') || 'ltr';
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
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-danger) 15%, transparent)' }}
              >
                <AlertCircle className="w-10 h-10" style={{ color: 'var(--color-danger)' }} />
              </div>
            </div>

            <div>
              <h1 className="text-6xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                404
              </h1>
              <h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                {isRTL ? 'الصفحة غير موجودة' : 'Page Not Found'}
              </h2>
              <p className="text-base max-w-md mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL 
                  ? 'عذرًا، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'
                  : "Sorry, the page you are looking for doesn't exist or has been moved."}
              </p>
            </div>

            <div className={`flex flex-col sm:flex-row gap-3 justify-center ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
              <Link to="/dashboard">
                <Button 
                  className="w-full sm:w-auto text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <Home className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {isRTL ? 'الذهاب إلى لوحة التحكم' : 'Go to Dashboard'}
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
                  {isRTL ? 'العودة' : 'Go Back'}
                </Button>
              </Link>
            </div>

            <div className="pt-6" style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL 
                  ? 'إذا كنت تعتقد أن هذا خطأ، يرجى الاتصال بالدعم.'
                  : 'If you think this is an error, please contact support.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
