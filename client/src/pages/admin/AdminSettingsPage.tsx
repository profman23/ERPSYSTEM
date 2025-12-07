import { Building2, Bell, Lock, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

export default function AdminSettingsPage() {
  const { user } = useAuth();

  const settingsSections = [
    { name: 'Organization Profile', description: 'Update tenant name, logo, and contact info', icon: Building2 },
    { name: 'Notifications', description: 'Email and push notification preferences', icon: Bell },
    { name: 'Security', description: 'Password policies and access controls', icon: Lock },
    { name: 'Localization', description: 'Language and regional settings', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          Tenant Settings
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          Configure your organization's settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card 
              key={section.name} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-accent-light)' }}
                  >
                    <Icon className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      {section.name}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Your current organization information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div 
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-surface-hover)' }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>Tenant ID</span>
              <code 
                className="text-sm px-2 py-1 rounded border"
                style={{ 
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {user?.tenantId || 'N/A'}
              </code>
            </div>
            <div 
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-surface-hover)' }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>Access Scope</span>
              <Badge variant="info">
                {user?.accessScope || 'N/A'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
