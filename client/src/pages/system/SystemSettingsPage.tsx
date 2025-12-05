import { Settings, Globe, Mail, Shield, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SystemSettingsPage() {
  const settingsSections = [
    { name: 'General Settings', description: 'Platform name, timezone, defaults', icon: Settings },
    { name: 'Email Configuration', description: 'SMTP settings, email templates', icon: Mail },
    { name: 'Security Settings', description: 'Password policies, 2FA, session timeout', icon: Shield },
    { name: 'Database Management', description: 'Backup, maintenance, migrations', icon: Database },
    { name: 'Localization', description: 'Languages, regions, formatting', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--sys-text)' }}>System Settings</h1>
        <p className="mt-2" style={{ color: 'var(--sys-text-secondary)' }}>
          Configure platform-wide settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card 
              key={section.name} 
              className="border transition-colors cursor-pointer hover:border-white/20"
              style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}
                  >
                    <Icon className="w-6 h-6" style={{ color: 'var(--sys-accent)' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: 'var(--sys-text)' }}>{section.name}</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--sys-text-secondary)' }}>{section.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
        <CardHeader>
          <CardTitle style={{ color: 'var(--sys-text)' }}>Quick Actions</CardTitle>
          <CardDescription style={{ color: 'var(--sys-text-secondary)' }}>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              className="transition-colors"
              style={{ 
                backgroundColor: 'var(--sys-button)', 
                borderColor: 'var(--sys-border)', 
                color: 'var(--sys-text)' 
              }}
            >
              Clear Cache
            </Button>
            <Button 
              variant="outline" 
              className="transition-colors"
              style={{ 
                backgroundColor: 'var(--sys-button)', 
                borderColor: 'var(--sys-border)', 
                color: 'var(--sys-text)' 
              }}
            >
              Sync DPF Structure
            </Button>
            <Button 
              variant="outline" 
              className="transition-colors"
              style={{ 
                backgroundColor: 'var(--sys-button)', 
                borderColor: 'var(--sys-border)', 
                color: 'var(--sys-text)' 
              }}
            >
              Run Health Check
            </Button>
            <Button 
              variant="outline" 
              className="transition-colors"
              style={{ 
                backgroundColor: 'var(--sys-button)', 
                borderColor: 'var(--sys-border)', 
                color: 'var(--sys-text)' 
              }}
            >
              View Audit Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
