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
        <h1 className="text-3xl font-bold text-white">System Settings</h1>
        <p className="mt-2 text-gray-400">
          Configure platform-wide settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card 
              key={section.name} 
              className="bg-[#1E293B] border-[#334155] hover:border-[#475569] transition-colors cursor-pointer"
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{section.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{section.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-[#1E293B] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
          <CardDescription className="text-gray-400">
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-[#334155] text-gray-300 hover:bg-[#334155]">
              Clear Cache
            </Button>
            <Button variant="outline" className="border-[#334155] text-gray-300 hover:bg-[#334155]">
              Sync DPF Structure
            </Button>
            <Button variant="outline" className="border-[#334155] text-gray-300 hover:bg-[#334155]">
              Run Health Check
            </Button>
            <Button variant="outline" className="border-[#334155] text-gray-300 hover:bg-[#334155]">
              View Audit Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
