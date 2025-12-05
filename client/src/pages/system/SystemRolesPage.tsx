import { Shield, Plus, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SystemRolesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--sys-text)' }}>Roles & Permissions</h1>
          <p className="mt-2" style={{ color: 'var(--sys-text-secondary)' }}>
            Manage platform-wide roles and permission templates
          </p>
        </div>
        <Button 
          className="transition-colors"
          style={{ 
            background: 'linear-gradient(135deg, var(--sys-accent), #7C3AED)', 
            color: 'var(--sys-text)' 
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Role Template
        </Button>
      </div>

      <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--sys-text)' }}>
            <Shield className="w-5 h-5" style={{ color: 'var(--sys-accent)' }} />
            Role Templates
          </CardTitle>
          <CardDescription style={{ color: 'var(--sys-text-secondary)' }}>
            Define permission templates that can be assigned to tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Settings className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--sys-text-muted)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--sys-text-secondary)' }}>Role Management</p>
            <p className="mt-2" style={{ color: 'var(--sys-text-muted)' }}>Configure platform-wide role templates here</p>
            <p className="text-sm mt-4" style={{ color: 'var(--sys-text-muted)' }}>Coming in Phase 2</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
