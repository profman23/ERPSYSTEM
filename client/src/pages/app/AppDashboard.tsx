import { useTranslation } from 'react-i18next';
import { Calendar, ClipboardList, Clock, Stethoscope, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function AppDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const todayStats = [
    { key: 'appointments', title: t('app.appointments'), value: '8', icon: Calendar, color: 'var(--app-accent)' },
    { key: 'tasks', title: t('app.pendingTasks'), value: '3', icon: ClipboardList, color: 'var(--app-warning)' },
    { key: 'patients', title: t('app.patientsToday'), value: '12', icon: Stethoscope, color: 'var(--app-info)' },
  ];

  const upcomingAppointments = [
    { patient: 'Max (Golden Retriever)', owner: 'John Smith', time: '09:00 AM', type: 'Checkup' },
    { patient: 'Luna (Persian Cat)', owner: 'Sarah Johnson', time: '10:30 AM', type: 'Vaccination' },
    { patient: 'Rocky (German Shepherd)', owner: 'Mike Brown', time: '11:00 AM', type: 'Surgery Follow-up' },
    { patient: 'Bella (Siamese Cat)', owner: 'Emma Wilson', time: '02:00 PM', type: 'Dental Cleaning' },
  ];

  const notifications = [
    { message: 'Lab results ready for Max', time: '10 min ago', type: 'info' },
    { message: 'Appointment reminder: Luna at 10:30 AM', time: '30 min ago', type: 'reminder' },
    { message: 'Medication refill needed for Rocky', time: '1 hour ago', type: 'warning' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>
            {t('common.welcome')}, {user?.name || 'Doctor'}!
          </h1>
        </div>
        <Button
          className="text-white"
          style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--app-accent-hover))' }}
        >
          <Calendar className="w-4 h-4 me-2" />
          {t('app.viewFullSchedule')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {todayStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.key}
              className="border shadow-sm hover:shadow-md transition-shadow"
              style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{stat.title}</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: 'var(--app-text)' }}>{stat.value}</p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 15%, transparent)` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-2 border shadow-sm"
          style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
              <Clock className="w-5 h-5" style={{ color: 'var(--app-accent)' }} />
              {t('app.upcomingAppointments')}
            </CardTitle>
            <CardDescription style={{ color: 'var(--app-text-secondary)' }}>
              {t('app.yourScheduleToday')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAppointments.map((apt, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--app-surface-hover)' }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--app-accent-hover))' }}
                    >
                      {apt.patient.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--app-text)' }}>{apt.patient}</p>
                      <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{apt.owner}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--app-accent)' }}>{apt.time}</p>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{apt.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card
          className="border shadow-sm"
          style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
              <Bell className="w-5 h-5" style={{ color: 'var(--app-warning)' }} />
              {t('nav.notifications')}
            </CardTitle>
            <CardDescription style={{ color: 'var(--app-text-secondary)' }}>
              {t('app.recentUpdates')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: notification.type === 'warning'
                      ? 'var(--badge-warning-bg)'
                      : notification.type === 'reminder'
                        ? 'var(--badge-info-bg)'
                        : 'var(--app-surface-hover)'
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--app-text)' }}>{notification.message}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--app-text-muted)' }}>{notification.time}</p>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-4"
              style={{ color: 'var(--app-accent)' }}
            >
              {t('app.viewAllNotifications')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
