import { Database, Layers, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SystemDPFPage() {
  const dpfModules = [
    { name: 'ADMIN', screens: 5, actions: 20, status: 'active' },
    { name: 'PATIENTS', screens: 4, actions: 16, status: 'active' },
    { name: 'APPOINTMENTS', screens: 3, actions: 12, status: 'active' },
    { name: 'INVENTORY', screens: 4, actions: 16, status: 'active' },
    { name: 'BILLING', screens: 3, actions: 12, status: 'active' },
    { name: 'REPORTS', screens: 2, actions: 8, status: 'active' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--sys-text)' }}>DPF Manager</h1>
        <p className="mt-2" style={{ color: 'var(--sys-text-secondary)' }}>
          Dynamic Permission Fabric - Module, Screen & Action Management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--sys-accent) 20%, transparent)' }}
              >
                <Layers className="w-6 h-6" style={{ color: 'var(--sys-accent)' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--sys-text)' }}>14</p>
                <p className="text-sm" style={{ color: 'var(--sys-text-secondary)' }}>Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--badge-info-bg)' }}
              >
                <Database className="w-6 h-6" style={{ color: 'var(--color-info)' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--sys-text)' }}>22</p>
                <p className="text-sm" style={{ color: 'var(--sys-text-secondary)' }}>Screens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--badge-success-bg)' }}
              >
                <Shield className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--sys-text)' }}>85</p>
                <p className="text-sm" style={{ color: 'var(--sys-text-secondary)' }}>Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
        <CardHeader>
          <CardTitle style={{ color: 'var(--sys-text)' }}>Permission Modules</CardTitle>
          <CardDescription style={{ color: 'var(--sys-text-secondary)' }}>
            Registered modules in the Dynamic Permission Fabric
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dpfModules.map((module) => (
              <div 
                key={module.name} 
                className="flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--sys-bg)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sys-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--sys-bg)'}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--sys-accent), var(--sys-accent-hover))',
                      color: 'var(--color-text-on-accent)'
                    }}
                  >
                    {module.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--sys-text)' }}>{module.name}</p>
                    <p className="text-sm" style={{ color: 'var(--sys-text-muted)' }}>
                      {module.screens} screens • {module.actions} actions
                    </p>
                  </div>
                </div>
                <span 
                  className="px-3 py-1 text-xs rounded-full"
                  style={{ backgroundColor: 'var(--badge-success-bg)', color: 'var(--color-text-success)' }}
                >
                  {module.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
