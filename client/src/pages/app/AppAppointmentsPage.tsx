import { useTranslation } from 'react-i18next';
import { Calendar, Plus, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { StyledIcon } from '@/components/ui/StyledIcon';

export default function AppAppointmentsPage() {
  const { t } = useTranslation();
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const appointments = [
    { id: 1, patient: 'Max', species: 'Dog', owner: 'John Smith', time: '09:00 AM', type: 'Checkup', status: 'confirmed' },
    { id: 2, patient: 'Luna', species: 'Cat', owner: 'Sarah Johnson', time: '10:30 AM', type: 'Vaccination', status: 'confirmed' },
    { id: 3, patient: 'Rocky', species: 'Dog', owner: 'Mike Brown', time: '11:00 AM', type: 'Surgery', status: 'pending' },
    { id: 4, patient: 'Bella', species: 'Cat', owner: 'Emma Wilson', time: '02:00 PM', type: 'Dental', status: 'confirmed' },
    { id: 5, patient: 'Charlie', species: 'Dog', owner: 'David Lee', time: '03:30 PM', type: 'Follow-up', status: 'confirmed' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <StyledIcon icon={Calendar} emoji="📅" className="w-8 h-8 text-[var(--color-accent)]" />
              <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>Appointments</h1>
            </div>
            <p className="mt-1" style={{ color: 'var(--app-text-secondary)' }}>Manage your scheduled appointments</p>
          </div>
          <Button
            className="text-white"
            style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--app-accent-hover))' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
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
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--app-text-muted)' }} />
              <Input placeholder={t('common.searchPlaceholder')} className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {t('common.filter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="border-0 shadow-sm"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
            <StyledIcon icon={Calendar} emoji="📅" className="w-5 h-5" style={{ color: 'var(--app-accent)' }} />
            Today's Appointments
          </CardTitle>
          <CardDescription style={{ color: 'var(--app-text-secondary)' }}>{appointments.length} appointments scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div 
                key={apt.id}
                className="flex items-center justify-between p-4 rounded-xl transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--app-surface-hover)' }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--app-accent-hover))' }}
                  >
                    {apt.patient.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--app-text)' }}>{apt.patient} ({apt.species})</p>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{apt.owner}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: 'var(--app-accent)' }}>{apt.time}</p>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{apt.type}</p>
                  </div>
                  <span 
                    className="px-3 py-1 text-xs rounded-full font-medium"
                    style={{ 
                      backgroundColor: `color-mix(in srgb, ${apt.status === 'confirmed' ? 'var(--app-success)' : 'var(--app-warning)'} 20%, transparent)`,
                      color: apt.status === 'confirmed' ? 'var(--app-success)' : 'var(--app-warning)'
                    }}
                  >
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
