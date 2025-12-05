import { Activity, Cpu, HardDrive, Wifi } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SystemMetricsPage() {
  const metrics = [
    { name: 'API Response Time', value: '45ms', trend: 'stable', icon: Activity },
    { name: 'CPU Usage', value: '23%', trend: 'low', icon: Cpu },
    { name: 'Memory Usage', value: '512MB', trend: 'stable', icon: HardDrive },
    { name: 'Active Connections', value: '127', trend: 'high', icon: Wifi },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--sys-text)' }}>Platform Metrics</h1>
        <p className="mt-2" style={{ color: 'var(--sys-text-secondary)' }}>
          Real-time system performance and usage statistics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card 
              key={metric.name} 
              className="border"
              style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: 'var(--sys-accent)' }} />
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    metric.trend === 'low' ? 'bg-green-500/20 text-green-400' :
                    metric.trend === 'high' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {metric.trend}
                  </span>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--sys-text)' }}>{metric.value}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--sys-text-secondary)' }}>{metric.name}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border" style={{ backgroundColor: 'var(--sys-surface)', borderColor: 'var(--sys-border)' }}>
        <CardHeader>
          <CardTitle style={{ color: 'var(--sys-text)' }}>Performance Overview</CardTitle>
          <CardDescription style={{ color: 'var(--sys-text-secondary)' }}>
            System performance charts will be displayed here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg"
            style={{ borderColor: 'var(--sys-border)' }}
          >
            <p style={{ color: 'var(--sys-text-muted)' }}>Performance charts - Coming in Phase 3</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
