import { Shield, Plus, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SystemRolesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Roles & Permissions</h1>
          <p className="mt-2 text-gray-400">
            Manage platform-wide roles and permission templates
          </p>
        </div>
        <Button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Role Template
        </Button>
      </div>

      <Card className="bg-[#1E293B] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Role Templates
          </CardTitle>
          <CardDescription className="text-gray-400">
            Define permission templates that can be assigned to tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-lg font-medium text-gray-300">Role Management</p>
            <p className="mt-2">Configure platform-wide role templates here</p>
            <p className="text-sm mt-4 text-gray-600">Coming in Phase 2</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
