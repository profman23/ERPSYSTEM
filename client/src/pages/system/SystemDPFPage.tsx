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
        <h1 className="text-3xl font-bold text-white">DPF Manager</h1>
        <p className="mt-2 text-gray-400">
          Dynamic Permission Fabric - Module, Screen & Action Management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Layers className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">14</p>
                <p className="text-sm text-gray-400">Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">22</p>
                <p className="text-sm text-gray-400">Screens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">85</p>
                <p className="text-sm text-gray-400">Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1E293B] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white">Permission Modules</CardTitle>
          <CardDescription className="text-gray-400">
            Registered modules in the Dynamic Permission Fabric
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dpfModules.map((module) => (
              <div 
                key={module.name} 
                className="flex items-center justify-between p-4 rounded-lg bg-[#0F172A] hover:bg-[#1a2744] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                    {module.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-white">{module.name}</p>
                    <p className="text-sm text-gray-500">
                      {module.screens} screens • {module.actions} actions
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
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
