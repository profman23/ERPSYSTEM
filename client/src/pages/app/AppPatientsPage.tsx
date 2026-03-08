import { useTranslation } from 'react-i18next';
import { Stethoscope, Plus, Search, PawPrint } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { StyledIcon } from '@/components/ui/StyledIcon';

export default function AppPatientsPage() {
  const { t } = useTranslation();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const patients = [
    { id: 1, name: 'Max', species: 'Dog', breed: 'Golden Retriever', owner: 'John Smith', age: '3 years', lastVisit: '2 days ago' },
    { id: 2, name: 'Luna', species: 'Cat', breed: 'Persian', owner: 'Sarah Johnson', age: '2 years', lastVisit: '1 week ago' },
    { id: 3, name: 'Rocky', species: 'Dog', breed: 'German Shepherd', owner: 'Mike Brown', age: '5 years', lastVisit: '3 days ago' },
    { id: 4, name: 'Bella', species: 'Cat', breed: 'Siamese', owner: 'Emma Wilson', age: '1 year', lastVisit: 'Today' },
    { id: 5, name: 'Charlie', species: 'Dog', breed: 'Labrador', owner: 'David Lee', age: '4 years', lastVisit: '2 weeks ago' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <StyledIcon icon={PawPrint} emoji="🐾" className="w-8 h-8 text-[var(--color-accent)]" />
              <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{t('pets.title')}</h1>
            </div>
          </div>
          <Button
            className="text-white"
            style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--app-accent-hover))' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('pets.createPatient')}
          </Button>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <Card
        className="border-0 shadow-sm"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--app-text-muted)' }} />
            <Input placeholder={t('pets.searchPatients')} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card 
        className="border-0 shadow-sm"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
            <StyledIcon icon={Stethoscope} emoji="🐾" className="w-5 h-5" style={{ color: 'var(--app-accent)' }} />
            {t('pets.patientRecords')}
          </CardTitle>
          <CardDescription style={{ color: 'var(--app-text-secondary)' }}>{t('pets.patientsRegistered', { count: patients.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {patients.map((patient) => (
              <div 
                key={patient.id}
                className="flex items-center justify-between p-4 rounded-xl transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--app-surface-hover)' }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--app-info), var(--app-accent))' }}
                  >
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--app-text)' }}>{patient.name}</p>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{patient.species} • {patient.breed}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>{patient.owner}</p>
                    <p className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>{patient.age}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>{t('pets.lastVisit')}</p>
                    <p className="text-sm" style={{ color: 'var(--app-accent)' }}>{patient.lastVisit}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
