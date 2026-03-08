import { FileText, Download, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRouteBreadcrumbs } from '@/hooks/useRouteBreadcrumbs';
import { StyledIcon } from '@/components/ui/StyledIcon';

export default function AppReportsPage() {
  const { items: breadcrumbs, homeHref } = useRouteBreadcrumbs();
  const reports = [
    { name: 'Daily Summary', description: 'Overview of today\'s activities', date: 'Today', type: 'daily' },
    { name: 'Weekly Performance', description: 'Week performance metrics', date: 'This Week', type: 'weekly' },
    { name: 'Monthly Revenue', description: 'Monthly financial summary', date: 'November 2025', type: 'monthly' },
    { name: 'Patient Statistics', description: 'Patient demographics and trends', date: 'Last 30 days', type: 'analytics' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <StyledIcon icon={BarChart3} emoji="📊" className="w-8 h-8 text-[var(--color-accent)]" />
              <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>Reports</h1>
            </div>
          </div>
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Select Period
          </Button>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="mt-2">
            <Breadcrumbs items={breadcrumbs} showHome homeHref={homeHref} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="border-0 shadow-sm"
          style={{ background: `linear-gradient(to bottom right, color-mix(in srgb, var(--app-accent) 10%, transparent), color-mix(in srgb, var(--app-success) 10%, transparent))` }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--app-accent)' }}>Appointments This Week</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--app-text)' }}>47</p>
                <p className="text-sm mt-1 flex items-center gap-1" style={{ color: 'var(--app-success)' }}>
                  <StyledIcon icon={TrendingUp} className="w-4 h-4" />
                  +12% from last week
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, var(--app-accent) 20%, transparent)` }}
              >
                <StyledIcon icon={Calendar} emoji="📅" className="w-6 h-6" style={{ color: 'var(--app-accent)' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="border-0 shadow-sm"
          style={{ background: `linear-gradient(to bottom right, color-mix(in srgb, var(--app-info) 10%, transparent), color-mix(in srgb, var(--app-accent) 10%, transparent))` }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--app-info)' }}>Reports Generated</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--app-text)' }}>12</p>
                <p className="text-sm mt-1" style={{ color: 'var(--app-text-secondary)' }}>This month</p>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, var(--app-info) 20%, transparent)` }}
              >
                <StyledIcon icon={FileText} emoji="📊" className="w-6 h-6" style={{ color: 'var(--app-info)' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card 
        className="border-0 shadow-sm"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
            <StyledIcon icon={FileText} emoji="📊" className="w-5 h-5" style={{ color: 'var(--app-accent)' }} />
            Available Reports
          </CardTitle>
          <CardDescription style={{ color: 'var(--app-text-secondary)' }}>Generate and download reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((report, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--app-surface-hover)' }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ 
                      backgroundColor: `color-mix(in srgb, ${
                        report.type === 'daily' ? 'var(--app-info)' :
                        report.type === 'weekly' ? 'var(--color-accent)' :
                        report.type === 'monthly' ? 'var(--app-success)' : 'var(--app-warning)'
                      } 20%, transparent)` 
                    }}
                  >
                    <StyledIcon
                      icon={FileText}
                      emoji="📊"
                      className="w-5 h-5"
                      style={{
                        color: report.type === 'daily' ? 'var(--app-info)' :
                          report.type === 'weekly' ? 'var(--color-accent)' :
                          report.type === 'monthly' ? 'var(--app-success)' : 'var(--app-warning)'
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--app-text)' }}>{report.name}</p>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{report.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{report.date}</span>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
